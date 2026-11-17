import * as childProcess from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import type * as vscode from 'vscode';
import type { CompileResult } from '../compiler/xsltCompiler';
import type { MapDocument } from '../model';
import type { SchemaTree } from '../model/schemaModel';
import { errorCategory, getDataMapperLogger } from '../logger';

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
  method: string;
  started: number;
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

export interface WorkerSchemaReference {
  filePath?: string;
  rootName?: string;
  inlineSchemaXml?: string;
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
  private readonly output: vscode.LogOutputChannel;

  constructor(private readonly context: vscode.ExtensionContext) {
    this.output = getDataMapperLogger();
  }

  public async testMap(request: WorkerTestMapRequest): Promise<WorkerTestMapResult> {
    return this.request<WorkerTestMapResult>('testMap', request, 60_000);
  }

  public async compileMap(request: WorkerCompileMapRequest): Promise<CompileResult> {
    return this.request<CompileResult>(
      'compileMap',
      {
        map: request.map,
        sourceSchema: this.serializeSchema(request.sourceSchema, request.map.sourceSchema),
        targetSchema: this.serializeSchema(request.targetSchema, request.map.targetSchema),
        sourceSchemaReference: this.createSchemaReference(request.sourceSchema, request.map.sourceSchema),
        targetSchemaReference: this.createSchemaReference(request.targetSchema, request.map.targetSchema),
      },
      120_000
    );
  }

  public dispose(): void {
    this.output.info('Compiler worker disposing.');
    this.disposed = true;
    if (this.process && !this.process.killed) {
      this.sendRaw('shutdown', {}, 2_000).catch(() => undefined);
      const processToStop = this.process;
      setTimeout(() => {
        if (!processToStop.killed && processToStop.exitCode === null) {
          processToStop.kill();
        }
      }, 2_000);
    }
    this.rejectPending(new Error('Compiler worker disposed.'));
  }

  private async request<T>(method: string, params: unknown, timeoutMilliseconds: number): Promise<T> {
    await this.ensureStarted();
    return this.sendRaw<T>(method, params, timeoutMilliseconds);
  }

  private async ensureStarted(): Promise<void> {
    if (this.process && this.process.exitCode === null) {
      return;
    }
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
    const executable = this.context.asAbsolutePath(
      path.join('tools', 'compiler-worker', 'runtime', 'win-x64', 'BizTalk.DataMapper.Worker.exe')
    );
    const project = this.context.asAbsolutePath(
      path.join('tools', 'compiler-worker', 'BizTalk.DataMapper.Worker', 'BizTalk.DataMapper.Worker.csproj')
    );

    const command = fs.existsSync(executable) ? executable : 'dotnet';
    const args = fs.existsSync(executable) ? ['--worker'] : ['run', '--project', project, '--configuration', 'Release', '--', '--worker'];

    this.output.info(`Compiler worker starting (${command === 'dotnet' ? 'dotnet project' : 'packaged executable'}).`);
    const worker = childProcess.spawn(command, args, {
      cwd: this.context.extensionPath,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    this.process = worker;

    const lines = readline.createInterface({ input: worker.stdout });
    lines.on('line', (line) => this.handleResponse(line));
    worker.stderr.on('data', (data) =>
      this.output.warn(`Compiler worker stderr received (${Buffer.byteLength(data)} bytes; contents omitted).`)
    );
    worker.on('error', (error) => {
      this.output.error(`Compiler worker process failed (${errorCategory(error)}).`);
      this.rejectPending(error);
    });
    worker.on('exit', (code, signal) => {
      this.output.info(`Compiler worker exited (code=${code}, signal=${signal || 'none'}).`);
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
        compilerHostPath: this.context.asAbsolutePath(path.join('out', 'compilerHost.js')),
      },
      30_000
    );
    if (initialized.protocolVersion !== 1) {
      this.output.error('Compiler worker protocol mismatch; expected version 1.');
      worker.kill();
      throw new Error(`Unsupported compiler worker protocol ${initialized.protocolVersion}; expected 1.`);
    }
    this.output.info('Compiler worker ready (protocol version 1).');
  }

  private sendRaw<T>(method: string, params: unknown, timeoutMilliseconds: number): Promise<T> {
    const worker = this.process;
    if (!worker || worker.exitCode !== null) {
      this.output.error(`Compiler worker ${method} request rejected: worker is not running.`);
      return Promise.reject(new Error('Compiler worker is not running.'));
    }
    const id = this.nextRequestId++;
    const started = Date.now();
    this.output.info(`Worker request #${id} ${method} started (timeout=${timeoutMilliseconds}ms).`);
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        const error = new Error(`Compiler worker request '${method}' timed out.`);
        this.output.error(`Worker request #${id} ${method} timed out after ${Date.now() - started}ms.`);
        reject(error);
        if (this.process === worker) {
          this.process = undefined;
          worker.kill();
          this.rejectPending(error);
        }
      }, timeoutMilliseconds);
      this.pending.set(id, { resolve, reject, timeout, method, started });
      worker.stdin.write(`${JSON.stringify({ id, method, params })}\n`, (error) => {
        if (error) {
          this.output.error(`Worker request #${id} ${method} write failed (${errorCategory(error)}).`);
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
      this.output.warn(`Invalid compiler worker response (${Buffer.byteLength(line)} bytes; contents omitted).`);
      return;
    }
    const pending = this.pending.get(response.id);
    if (!pending) {
      this.output.debug('Compiler worker response ignored: no matching request.');
      return;
    }
    clearTimeout(pending.timeout);
    this.pending.delete(response.id);
    if (response.error) {
      this.output.error(
        `Worker request #${response.id} ${pending.method} failed after ${Date.now() - pending.started}ms (${errorCategory(
          new CompilerWorkerError(response.error.code, response.error.message)
        )}); details returned to the editor.`
      );
      pending.reject(new CompilerWorkerError(response.error.code, response.error.message, response.error.details));
    } else {
      this.output.info(`Worker request #${response.id} ${pending.method} completed in ${Date.now() - pending.started}ms.`);
      pending.resolve(response.result);
    }
  }

  private rejectPending(error: Error): void {
    for (const request of this.pending.values()) {
      this.output.error(`Worker ${request.method} request aborted after ${Date.now() - request.started}ms (${errorCategory(error)}).`);
      clearTimeout(request.timeout);
      request.reject(error);
    }
    this.pending.clear();
  }

  private serializeSchema(schema: SchemaTree | undefined, reference: MapDocument['sourceSchema']): unknown {
    if (!schema) {
      return undefined;
    }
    if (this.createSchemaReference(schema, reference)) {
      return undefined;
    }
    return {
      ...schema,
      namespaces: { ...schema.namespaces },
    };
  }

  private createSchemaReference(schema: SchemaTree | undefined, reference: MapDocument['sourceSchema']): WorkerSchemaReference | undefined {
    if (!schema) {
      return undefined;
    }
    if (reference.inlineSchemaXml) {
      return {
        inlineSchemaXml: reference.inlineSchemaXml,
        filePath: schema.filePath,
        rootName: reference.rootName,
      };
    }
    if (schema.filePath && fs.existsSync(schema.filePath)) {
      return {
        filePath: schema.filePath,
        rootName: reference.rootName,
      };
    }
    return undefined;
  }
}
