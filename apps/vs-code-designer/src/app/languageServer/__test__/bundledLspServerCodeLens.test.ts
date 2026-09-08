import AdmZip from 'adm-zip';
import type { ChildProcessWithoutNullStreams } from 'child_process';
import { mkdtemp, rm } from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import { afterEach, describe, expect, it, vi } from 'vitest';

interface JsonRpcMessage {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

interface CodeLensResult {
  command?: {
    title?: string;
    command?: string;
    arguments?: unknown[];
  };
}

class LspProcess {
  private nextId = 1;
  private stdoutBuffer = Buffer.alloc(0);
  private readonly pending = new Map<
    number,
    {
      resolve: (message: JsonRpcMessage) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();
  private readonly stderrChunks: string[] = [];
  private disposed = false;

  public constructor(private readonly child: ChildProcessWithoutNullStreams) {
    child.stdout.on('data', (chunk: Buffer) => this.handleStdout(chunk));
    child.stderr.on('data', (chunk: Buffer) => this.stderrChunks.push(chunk.toString('utf8')));
    child.on('exit', (code, signal) => {
      if (this.disposed) {
        return;
      }

      const error = new Error(`LSP server exited unexpectedly with code ${code ?? 'null'} signal ${signal ?? 'null'}.\n${this.stderr}`);
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timeout);
        pending.reject(error);
      }
      this.pending.clear();
    });
  }

  public get stderr(): string {
    return this.stderrChunks.join('');
  }

  public async request<T>(method: string, params: unknown): Promise<T> {
    const id = this.nextId++;
    const responsePromise = new Promise<JsonRpcMessage>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method} response.\n${this.stderr}`));
      }, 30_000);

      this.pending.set(id, { resolve, reject, timeout });
    });

    this.write({ jsonrpc: '2.0', id, method, params });
    const response = await responsePromise;
    if (response.error) {
      throw new Error(`LSP ${method} failed: ${JSON.stringify(response.error)}\n${this.stderr}`);
    }

    return response.result as T;
  }

  public notify(method: string, params: unknown): void {
    this.write({ jsonrpc: '2.0', method, params });
  }

  public async dispose(): Promise<void> {
    this.disposed = true;

    try {
      await this.request('shutdown', undefined);
      this.notify('exit', undefined);
    } catch {
      // The process is being torn down; a failed shutdown request should not hide the test assertion.
    }

    if (!this.child.killed) {
      this.child.kill();
    }
  }

  private write(message: JsonRpcMessage & { jsonrpc: '2.0' }): void {
    const body = JSON.stringify(message);
    const header = `Content-Length: ${Buffer.byteLength(body, 'utf8')}\r\n\r\n`;
    this.child.stdin.write(header + body, 'utf8');
  }

  private handleStdout(chunk: Buffer): void {
    this.stdoutBuffer = Buffer.concat([this.stdoutBuffer, chunk]);

    while (true) {
      const headerEnd = this.stdoutBuffer.indexOf('\r\n\r\n');
      if (headerEnd < 0) {
        return;
      }

      const header = this.stdoutBuffer.subarray(0, headerEnd).toString('ascii');
      const lengthMatch = /Content-Length:\s*(\d+)/i.exec(header);
      if (!lengthMatch) {
        throw new Error(`Invalid LSP header: ${header}`);
      }

      const contentLength = Number(lengthMatch[1]);
      const bodyStart = headerEnd + 4;
      const bodyEnd = bodyStart + contentLength;
      if (this.stdoutBuffer.length < bodyEnd) {
        return;
      }

      const body = this.stdoutBuffer.subarray(bodyStart, bodyEnd).toString('utf8');
      this.stdoutBuffer = this.stdoutBuffer.subarray(bodyEnd);
      const message = JSON.parse(body) as JsonRpcMessage;
      if (typeof message.id === 'number') {
        const pending = this.pending.get(message.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pending.delete(message.id);
          pending.resolve(message);
        }
      }
    }
  }
}

describe('bundled LSP server CodeLens', () => {
  let tempDirectories: string[] = [];
  let lspProcess: LspProcess | undefined;

  afterEach(async () => {
    await lspProcess?.dispose();
    lspProcess = undefined;

    await Promise.all(tempDirectories.map((directory) => rm(directory, { recursive: true, force: true })));
    tempDirectories = [];
  });

  it('returns create agent connection CodeLens for current built-in Agent source', async () => {
    const agentCodeLens = await getAgentCodeLens();

    expect(agentCodeLens.command?.title).toBe('Agent - Create agent connection');
    expect(JSON.stringify(agentCodeLens.command?.arguments)).toContain('AgentConnection');
    expect(JSON.stringify(agentCodeLens.command?.arguments)).toContain('agent');
  }, 60_000);

  it('returns manage agent connection CodeLens when the agent connection already exists', async () => {
    const agentCodeLens = await getAgentCodeLens({
      connections: {
        managedApiConnections: {
          agent: {
            api: { id: '/providers/Microsoft.Web/locations/westus/apis/agent' },
            connection: { id: '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Web/connections/agent' },
            connectionRuntimeUrl: '',
          },
        },
      },
    });

    expect(agentCodeLens.command?.title).toBe('Agent - Manage agent connection');
    expect(JSON.stringify(agentCodeLens.command?.arguments)).toContain('AgentConnection');
    expect(JSON.stringify(agentCodeLens.command?.arguments)).toContain('agent');
  }, 60_000);

  async function getAgentCodeLens(initializationOptions?: Record<string, unknown>): Promise<CodeLensResult> {
    lspProcess = await startBundledLspServer(initializationOptions);

    const documentUri = pathToFileURL(path.join(await createTempDirectory(), 'AgentWorkflow.cs')).toString();
    lspProcess.notify('textDocument/didOpen', {
      textDocument: {
        uri: documentUri,
        languageId: 'csharp',
        version: 1,
        text: agentWorkflowSource,
      },
    });

    const codeLenses = await lspProcess.request<CodeLensResult[]>('textDocument/codeLens', {
      textDocument: { uri: documentUri },
    });

    await lspProcess.dispose();
    lspProcess = undefined;

    const agentCodeLens = codeLenses.find((lens) => lens.command?.title?.includes('agent connection'));
    expect(agentCodeLens).toBeDefined();

    return agentCodeLens as CodeLensResult;
  }

  async function startBundledLspServer(initializationOptions?: Record<string, unknown>): Promise<LspProcess> {
    const extractDirectory = await createTempDirectory();
    const zipPath = path.join(process.cwd(), 'src', 'assets', 'LSPServer', 'LSPServer.zip');
    new AdmZip(zipPath).extractAllTo(extractDirectory, true, true);

    const serverDllPath = path.join(extractDirectory, 'SdkLspServer.dll');
    const sdkPackagePath = path.join(process.cwd(), 'src', 'assets', 'LSPServer', 'Microsoft.Azure.Workflows.Sdk.1.0.0-preview.1.nupkg');
    const { spawn: realSpawn } = await vi.importActual<typeof import('child_process')>('child_process');
    const child = realSpawn('dotnet', [serverDllPath, '--sdk', sdkPackagePath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    const server = new LspProcess(child);

    await server.request('initialize', {
      processId: process.pid,
      rootUri: null,
      capabilities: {
        textDocument: {
          codeLens: {
            dynamicRegistration: false,
          },
        },
      },
      initializationOptions,
    });
    server.notify('initialized', {});

    return server;
  }

  async function createTempDirectory(): Promise<string> {
    const directory = await mkdtemp(path.join(process.cwd(), 'logicapps-lsp-codelens-'));
    tempDirectories.push(directory);
    return directory;
  }
});

const agentWorkflowSource = `
using Microsoft.Azure.Workflows.Sdk;

public class AgentWorkflow
{
    public static FlowDefinition[] GetWorkflows()
    {
        var trigger = WorkflowTriggers.BuiltIn.CreateConversationalAgentTrigger();

        var agent = WorkflowActions.BuiltIn.Agent(
            agentModelType: AgentModelType.AzureOpenAI,
            deploymentId: "gpt-4.1",
            agentModelSettings: new AgentModelSettings(),
            connectionName: "agent",
            messages: () => new AgentPromptMessage[]
            {
                new AgentPromptMessage
                {
                    Role = MessageRole.System,
                    Content = "You are a weather agent"
                }
            }).WithName("WeatherAgent");

        return new[] { WorkflowFactory.CreateAgentWorkflow("AgentWorkflow", trigger.Then(agent)) };
    }
}`;
