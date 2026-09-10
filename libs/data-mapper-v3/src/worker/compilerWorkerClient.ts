import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import * as vscode from 'vscode';
import { CompileResult } from '../compiler/xsltCompiler';
import { MapDocument } from '../model';
import { SchemaTree } from '../model/schemaModel';

interface WorkerResponse {
    id: number;
    result?: unknown;
    error?: {
        code: string;
        message: string;
        details?: string;
    };
}

interface PendingRequest {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
}

export interface WorkerTestMapRequest {
    xslt: string;
    inputXml: string;
    extensionObjectXml?: string;
    workingDirectory?: string;
}

export interface WorkerTestMapResult {
    outputXml: string;
    diagnostics: string[];
}

export interface WorkerCompileMapRequest {
    map: MapDocument;
    sourceSchema?: SchemaTree;
    targetSchema?: SchemaTree;
}

export class CompilerWorkerError extends Error {
    constructor(
        public readonly code: string,
        message: string,
        public readonly details?: string
    ) {
        super(message);
        this.name = 'CompilerWorkerError';
    }
}

export class CompilerWorkerClient implements vscode.Disposable {
    private process?: childProcess.ChildProcessWithoutNullStreams;
    private startPromise?: Promise<void>;
    private nextRequestId = 1;
    private readonly pending = new Map<number, PendingRequest>();
    private disposed = false;
    private readonly output: vscode.OutputChannel;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.output = vscode.window.createOutputChannel('Logic App Data Mapper Worker');
    }

    public async testMap(request: WorkerTestMapRequest): Promise<WorkerTestMapResult> {
        return this.request<WorkerTestMapResult>('testMap', request, 60_000);
    }

    public async compileMap(request: WorkerCompileMapRequest): Promise<CompileResult> {
        return this.request<CompileResult>('compileMap', {
            map: request.map,
            sourceSchema: this.serializeSchema(request.sourceSchema),
            targetSchema: this.serializeSchema(request.targetSchema)
        }, 120_000);
    }

    public dispose(): void {
        this.disposed = true;
        if (this.process && !this.process.killed) {
            void this.sendRaw('shutdown', {}, 2_000).catch(() => undefined);
            const processToStop = this.process;
            setTimeout(() => {
                if (!processToStop.killed && processToStop.exitCode === null) {
                    processToStop.kill();
                }
            }, 2_000);
        }
        this.rejectPending(new Error('Compiler worker disposed.'));
        this.output.dispose();
    }

    private async request<T>(
        method: string,
        params: unknown,
        timeoutMilliseconds: number
    ): Promise<T> {
        await this.ensureStarted();
        return this.sendRaw<T>(method, params, timeoutMilliseconds);
    }

    private async ensureStarted(): Promise<void> {
        if (this.process && this.process.exitCode === null) { return; }
        if (this.disposed) {
            throw new Error('Compiler worker client is disposed.');
        }
        if (!this.startPromise) {
            this.startPromise = this.start().finally(() => {
                this.startPromise = undefined;
            });
        }
        return this.startPromise;
    }

    private async start(): Promise<void> {
        const executable = this.context.asAbsolutePath(path.join(
            'tools',
            'compiler-worker',
            'runtime',
            'win-x64',
            'BizTalk.DataMapper.Worker.exe'
        ));
        const project = this.context.asAbsolutePath(path.join(
            'tools',
            'compiler-worker',
            'BizTalk.DataMapper.Worker',
            'BizTalk.DataMapper.Worker.csproj'
        ));

        const command = fs.existsSync(executable) ? executable : 'dotnet';
        const args = fs.existsSync(executable)
            ? ['--worker']
            : ['run', '--project', project, '--configuration', 'Release', '--', '--worker'];

        this.output.appendLine(`Starting compiler worker: ${command}`);
        const worker = childProcess.spawn(command, args, {
            cwd: this.context.extensionPath,
            windowsHide: true,
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.process = worker;

        const lines = readline.createInterface({ input: worker.stdout });
        lines.on('line', line => this.handleResponse(line));
        worker.stderr.on('data', data => this.output.append(data.toString()));
        worker.on('error', error => {
            this.output.appendLine(`Worker process error: ${error.message}`);
            this.rejectPending(error);
        });
        worker.on('exit', (code, signal) => {
            this.output.appendLine(`Worker exited (code=${code}, signal=${signal || 'none'}).`);
            if (this.process === worker) {
                this.process = undefined;
            }
            this.rejectPending(new Error(`Compiler worker exited unexpectedly with code ${code}.`));
            lines.close();
        });

        const initialized = await this.sendRaw<{ protocolVersion: number }>(
            'initialize',
            {
                protocolVersion: 1,
                nodeExecutable: process.execPath,
                compilerHostPath: this.context.asAbsolutePath(path.join('out', 'compilerHost.js'))
            },
            30_000
        );
        if (initialized.protocolVersion !== 1) {
            worker.kill();
            throw new Error(
                `Unsupported compiler worker protocol ${initialized.protocolVersion}; expected 1.`
            );
        }
    }

    private sendRaw<T>(
        method: string,
        params: unknown,
        timeoutMilliseconds: number
    ): Promise<T> {
        const worker = this.process;
        if (!worker || worker.exitCode !== null) {
            return Promise.reject(new Error('Compiler worker is not running.'));
        }
        const id = this.nextRequestId++;
        return new Promise<T>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                const error = new Error(`Compiler worker request '${method}' timed out.`);
                reject(error);
                if (this.process === worker) {
                    this.process = undefined;
                    worker.kill();
                    this.rejectPending(error);
                }
            }, timeoutMilliseconds);
            this.pending.set(id, { resolve, reject, timeout });
            worker.stdin.write(`${JSON.stringify({ id, method, params })}\n`, error => {
                if (error) {
                    const pending = this.pending.get(id);
                    if (pending) {
                        clearTimeout(pending.timeout);
                        this.pending.delete(id);
                        pending.reject(error);
                    }
                }
            });
        });
    }

    private handleResponse(line: string): void {
        let response: WorkerResponse;
        try {
            response = JSON.parse(line) as WorkerResponse;
        } catch {
            this.output.appendLine(`Invalid worker response: ${line}`);
            return;
        }
        const pending = this.pending.get(response.id);
        if (!pending) { return; }
        clearTimeout(pending.timeout);
        this.pending.delete(response.id);
        if (response.error) {
            pending.reject(new CompilerWorkerError(
                response.error.code,
                response.error.message,
                response.error.details
            ));
        } else {
            pending.resolve(response.result);
        }
    }

    private rejectPending(error: Error): void {
        for (const request of this.pending.values()) {
            clearTimeout(request.timeout);
            request.reject(error);
        }
        this.pending.clear();
    }

    private serializeSchema(schema?: SchemaTree): unknown {
        if (!schema) { return undefined; }
        return {
            ...schema,
            namespaces: { ...schema.namespaces }
        };
    }
}
