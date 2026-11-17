import { execFile, spawn } from 'node:child_process';
import { constants } from 'node:fs';
import * as fs from 'node:fs/promises';
import { createServer } from 'node:net';
import * as path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { prepareLmlRuntimeWorkspace } from './runtimeWorkspace';
import type { LmlRuntimeWorkspace } from './runtimeWorkspace';
import type { ChildProcess } from 'node:child_process';

const execute = promisify(execFile);
const prerequisite =
  'Install Azure Functions Core Tools v4 with the Logic Apps Workflows extension bundle and .NET 8; make the native func executable available on PATH.';

export interface LmlDesignTimeRuntime extends LmlRuntimeWorkspace {
  baseUrl: string;
  port: number;
}

interface RuntimeEntry {
  controller: AbortController;
  promise: Promise<LmlDesignTimeRuntime>;
  child?: ChildProcess;
  stopping?: Promise<void>;
}

async function functionsExecutable(signal: AbortSignal): Promise<string> {
  const windows = process.platform === 'win32';
  const directories = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean);
  const candidates = directories.flatMap((directory) =>
    windows
      ? [path.resolve(directory, 'func.exe'), path.resolve(directory, 'node_modules/azure-functions-core-tools/bin/func.exe')]
      : [path.resolve(directory, 'func')]
  );
  if (windows && process.env.ProgramFiles) {
    candidates.push(path.join(process.env.ProgramFiles, 'Microsoft/Azure Functions Core Tools/func.exe'));
  }
  for (const candidate of candidates) {
    try {
      await fs.access(candidate, windows ? constants.F_OK : constants.X_OK);
      const { stdout } = await execute(candidate, ['host', 'start', '--help'], { timeout: 5000, signal, windowsHide: true });
      if (!stdout.includes('--address')) {
        throw new Error('Unsupported Functions Core Tools version.');
      }
      return candidate;
    } catch {
      signal.throwIfAborted();
    }
  }
  throw new Error(prerequisite);
}

async function freePort(): Promise<number> {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Cannot reserve a loopback port for the LML runtime.'));
        return;
      }
      server.close((error) => (error ? reject(error) : resolve(address.port)));
    });
  });
}

export class LmlDesignTimeRuntimeManager {
  private readonly entries = new Map<string, RuntimeEntry>();
  private disposed = false;

  constructor(private readonly logger: (message: string) => void = () => {}) {}

  async ensureStarted(projectPath: string): Promise<LmlDesignTimeRuntime> {
    const root = await fs.realpath(projectPath);
    if (this.disposed) {
      throw new Error('LML runtime manager is disposed.');
    }
    const existing = this.entries.get(root);
    if (existing) {
      if (existing.controller.signal.aborted) {
        await existing.promise.catch(() => undefined);
        await this.stop(existing);
        if (this.entries.get(root) === existing) {
          this.entries.delete(root);
        }
        return this.ensureStarted(root);
      }
      return existing.promise;
    }
    const entry: RuntimeEntry = { controller: new AbortController(), promise: Promise.resolve().then(() => this.start(root, entry)) };
    this.entries.set(root, entry);
    return entry.promise;
  }

  private async start(root: string, entry: RuntimeEntry): Promise<LmlDesignTimeRuntime> {
    const { signal } = entry.controller;
    const deadline = setTimeout(() => entry.controller.abort(), 60000);
    try {
      const executable = await functionsExecutable(signal);
      const workspace = await prepareLmlRuntimeWorkspace(root);
      const port = await freePort();
      signal.throwIfAborted();
      const baseUrl = `http://127.0.0.1:${port}`;
      const child = spawn(executable, ['host', 'start', '--port', String(port), '--address', '127.0.0.1'], {
        cwd: workspace.runtimePath,
        shell: false,
        detached: process.platform !== 'win32',
        windowsHide: true,
        stdio: 'ignore',
      });
      entry.child = child;
      const invalidate = () => {
        entry.controller.abort();
        return this.stop(entry).catch(() => this.logger('LML runtime process cleanup failed.'));
      };
      child.once('error', invalidate);
      child.once('exit', invalidate);
      this.logger('Starting LML design-time runtime.');
      while (!signal.aborted) {
        try {
          const response = await fetch(`${baseUrl}/runtime/webhooks/workflow/api/management/operationGroups`, {
            signal: AbortSignal.any([signal, AbortSignal.timeout(1000)]),
            redirect: 'error',
          });
          await response.body?.cancel();
          signal.throwIfAborted();
          if (response.ok) {
            this.logger('LML design-time runtime is ready.');
            return { ...workspace, port, baseUrl };
          }
        } catch {
          signal.throwIfAborted();
        }
        await delay(200, undefined, { signal });
      }
      throw new Error('LML runtime startup was cancelled.');
    } catch {
      await this.stop(entry);
      if (this.entries.get(root) === entry) {
        this.entries.delete(root);
      }
      this.logger('LML design-time runtime failed to start.');
      throw new Error(`LML runtime did not become ready within 60 seconds, exited, or was cancelled. ${prerequisite}`);
    } finally {
      clearTimeout(deadline);
    }
  }

  private stop(entry: RuntimeEntry): Promise<void> {
    if (entry.stopping) {
      return entry.stopping;
    }
    entry.stopping = (async () => {
      const pid = entry.child?.pid;
      if (!pid) {
        return;
      }
      if (process.platform === 'win32') {
        if (entry.child?.exitCode !== null || entry.child?.signalCode !== null) {
          return;
        }
        try {
          await execute(path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32/taskkill.exe'), ['/pid', String(pid), '/T', '/F'], {
            timeout: 5000,
            windowsHide: true,
          });
        } catch {
          if (entry.child?.exitCode === null && entry.child?.signalCode === null) {
            throw new Error('Could not terminate the owned LML runtime process tree.');
          }
        }
      } else {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
            throw new Error('Could not terminate the owned LML runtime process group.');
          }
        }
      }
    })();
    return entry.stopping;
  }

  async dispose(): Promise<void> {
    this.disposed = true;
    const entries = [...this.entries.values()];
    for (const entry of entries) {
      entry.controller.abort();
    }
    await Promise.all(
      entries.map(async (entry) => {
        await entry.promise.catch(() => undefined);
        await this.stop(entry);
      })
    );
    this.entries.clear();
  }
}
