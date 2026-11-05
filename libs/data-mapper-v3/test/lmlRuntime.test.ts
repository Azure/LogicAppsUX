import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFile, spawn } from 'node:child_process';
import { prepareLmlRuntimeWorkspace } from '../src/lml/runtimeWorkspace';
import { LmlDesignTimeRuntimeManager } from '../src/lml/designTimeRuntime';

vi.mock('node:child_process', async () => {
  const { promisify } = await import('node:util');
  const execute = vi.fn();
  Object.assign(execute, {
    [promisify.custom]: (...args: unknown[]) =>
      new Promise((resolve, reject) => {
        execute(...args, (error: Error | null, stdout: string, stderr: string) => {
          if (error) {
            reject(error);
          } else {
            resolve({ stdout, stderr });
          }
        });
      }),
  });
  return { execFile: execute, spawn: vi.fn() };
});

let root: string;
let manager: LmlDesignTimeRuntimeManager | undefined;
const children: Array<EventEmitter & { pid: number; exitCode: number | null; signalCode: string | null }> = [];

async function write(relative: string, contents: string): Promise<void> {
  const target = path.join(root, relative);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, contents);
}

beforeEach(async () => {
  vi.resetAllMocks();
  root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'lml-runtime-')));
  children.length = 0;
});

afterEach(async () => {
  await manager?.dispose();
  manager = undefined;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  await fs.rm(root, { recursive: true, force: true });
});

describe('LML runtime workspace', () => {
  it('uses the host defaults, stages byte-identical relative data, and excludes BTM/custom code', async () => {
    const schema = '\ufeff<xs:schema>\r\n<xs:include schemaLocation="nested/types.xsd"/>\r\n</xs:schema>';
    await write('Schemas/source.xsd', schema);
    await write('Schemas/nested/types.xsd', '<schema/>');
    await write('Schemas/target.json', '{ "type": "object" }\r\n');
    await write('Schemas/custom.dll', 'executable');
    await write('Schemas/unused.xsd', '<schema/>');
    await write('sample.lml', '$sourceSchema: source.xsd\r\n');
    await write('workflow-designtime/Artifacts/MapDefinitions/sample.lml', 'old runtime copy');
    await write('__generated/nested/sample.lml.xslt', '<stylesheet/>');
    await write('__generated/sample.xslt', 'BTM output');
    await write('__generated/sample.btm.xslt', 'BTM output');
    await write('__generated/custom.dll', 'executable');
    const workspace = await prepareLmlRuntimeWorkspace(root, ['source.xsd', 'target.json']);
    expect(workspace).toEqual({ projectPath: root, runtimePath: path.join(root, 'workflow-designtime') });
    await expect(fs.stat(path.join(root, 'Artifacts'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(path.join(workspace.runtimePath, 'Artifacts/Schemas/source.xsd'), 'utf8')).toBe(schema);
    expect(await fs.readFile(path.join(workspace.runtimePath, 'Artifacts/Schemas/nested/types.xsd'), 'utf8')).toBe('<schema/>');
    expect(await fs.readFile(path.join(workspace.runtimePath, 'Artifacts/Schemas/target.json'), 'utf8')).toBe('{ "type": "object" }\r\n');
    await expect(fs.stat(path.join(workspace.runtimePath, 'Artifacts/MapDefinitions'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(path.join(root, 'sample.lml'), 'utf8')).toBe('$sourceSchema: source.xsd\r\n');
    expect(await fs.readdir(path.join(workspace.runtimePath, 'Artifacts/Maps/nested'))).toEqual(['sample.lml.xslt']);
    expect(await fs.readdir(path.join(workspace.runtimePath, 'Artifacts/Maps'))).toEqual(['nested']);
    expect(await fs.readdir(path.join(workspace.runtimePath, 'Artifacts/Schemas'))).not.toContain('custom.dll');
    expect(await fs.readdir(path.join(workspace.runtimePath, 'Artifacts/Schemas'))).not.toContain('unused.xsd');
    expect(await fs.readFile(path.join(root, '__generated/sample.xslt'), 'utf8')).toBe('BTM output');
    const settings = JSON.parse(await fs.readFile(path.join(workspace.runtimePath, 'local.settings.json'), 'utf8'));
    expect(settings.Values).toEqual({
      APP_KIND: 'workflowapp',
      ProjectDirectoryPath: workspace.runtimePath,
      FUNCTIONS_WORKER_RUNTIME: 'dotnet',
      FUNCTIONS_INPROC_NET8_ENABLED: '1',
      AzureWebJobsSecretStorageType: 'Files',
    });
    const host = JSON.parse(await fs.readFile(path.join(workspace.runtimePath, 'host.json'), 'utf8'));
    expect(host.extensionBundle.id).toBe('Microsoft.Azure.Functions.ExtensionBundle.Workflows');
    expect(host.extensions.workflow.settings['Runtime.WorkflowOperationDiscoveryHostMode']).toBe('true');
  });

  it('preserves existing host and local settings verbatim on repeated preparation', async () => {
    const rootHost = '{ "userRoot": true }\r\n';
    const rootSettings = JSON.stringify({ Values: { ProjectDirectoryPath: root }, secret: 'do not log' });
    await write('host.json', rootHost);
    await write('local.settings.json', rootSettings);
    await write('workflow-designtime/host.json', '{ "user": true }');
    await write('workflow-designtime/local.settings.json', rootSettings);
    await prepareLmlRuntimeWorkspace(root);
    await prepareLmlRuntimeWorkspace(root);
    expect(await fs.readFile(path.join(root, 'host.json'), 'utf8')).toBe(rootHost);
    expect(await fs.readFile(path.join(root, 'local.settings.json'), 'utf8')).toBe(rootSettings);
    expect(await fs.readFile(path.join(root, 'workflow-designtime/host.json'), 'utf8')).toBe('{ "user": true }');
    expect(await fs.readFile(path.join(root, 'workflow-designtime/local.settings.json'), 'utf8')).toBe(rootSettings);
    await expect(fs.stat(path.join(root, 'Artifacts'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('mirrors project custom XSLT assets without copying executable extensions', async () => {
    const folder = 'Artifacts/DataMapper/Extensions/InlineXslt';
    await write(`${folder}/nested/format.xslt`, '<stylesheet/>');
    await write(`${folder}/lookup.xml`, '<lookup/>');
    await write(`${folder}/custom.dll`, 'executable');
    const workspace = await prepareLmlRuntimeWorkspace(root);
    expect(await fs.readFile(path.join(workspace.runtimePath, folder, 'nested/format.xslt'), 'utf8')).toBe('<stylesheet/>');
    expect(await fs.readFile(path.join(workspace.runtimePath, folder, 'lookup.xml'), 'utf8')).toBe('<lookup/>');
    await expect(fs.stat(path.join(workspace.runtimePath, folder, 'custom.dll'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await fs.readFile(path.join(root, folder, 'nested/format.xslt'), 'utf8')).toBe('<stylesheet/>');
  });

  it.each(['Schemas', 'workflow-designtime/Artifacts', 'workflow-designtime'])(
    'rejects a linked %s directory without writing outside',
    async (folder) => {
      const outside = await fs.mkdtemp(path.join(os.tmpdir(), 'lml-outside-'));
      try {
        await fs.mkdir(path.dirname(path.join(root, folder)), { recursive: true });
        await fs.symlink(outside, path.join(root, folder), process.platform === 'win32' ? 'junction' : 'dir');
        await expect(prepareLmlRuntimeWorkspace(root)).rejects.toThrow('linked');
        expect(await fs.readdir(outside)).toEqual([]);
      } finally {
        await fs.rm(outside, { recursive: true, force: true });
      }
    }
  );

  it('rejects hard-linked destinations without modifying their original', async () => {
    await write('Schemas/source.xsd', '<schema/>');
    await write('original.xsd', '<original/>');
    await fs.mkdir(path.join(root, 'workflow-designtime/Artifacts/Schemas'), { recursive: true });
    await fs.link(path.join(root, 'original.xsd'), path.join(root, 'workflow-designtime/Artifacts/Schemas/source.xsd'));
    await expect(prepareLmlRuntimeWorkspace(root, ['source.xsd'])).rejects.toThrow('linked');
    expect(await fs.readFile(path.join(root, 'original.xsd'), 'utf8')).toBe('<original/>');
  });

  it('keeps only selected schema closures, preserves nested paths and prunes copies after switching maps', async () => {
    await write('Schemas/nested/input.json', '{"$ref":"../shared/types.json#/definitions/value"}');
    await write('Schemas/shared/types.json', '{"$ref":"../nested/input.json#/definitions/value"}');
    await write('Schemas/nested/output.xsd', '<schema><include schemaLocation="../shared/types.xsd"/></schema>');
    await write('Schemas/shared/types.xsd', '<schema/>');
    await write('Schemas/other.xsd', '<schema/>');
    const workspace = await prepareLmlRuntimeWorkspace(root, ['nested/input.json', 'nested/output.xsd']);
    const staged = path.join(workspace.runtimePath, 'Artifacts/Schemas');
    expect(await fs.readdir(path.join(staged, 'nested'))).toEqual(['input.json', 'output.xsd']);
    expect(await fs.readdir(path.join(staged, 'shared'))).toEqual(['types.json', 'types.xsd']);
    await expect(fs.stat(path.join(staged, 'other.xsd'))).rejects.toMatchObject({ code: 'ENOENT' });
    await prepareLmlRuntimeWorkspace(root, ['other.xsd']);
    expect(await fs.readdir(staged)).toEqual(['other.xsd']);
    expect(await fs.readFile(path.join(root, 'Schemas/nested/input.json'), 'utf8')).toContain('../shared/types.json');
    await expect(fs.stat(path.join(workspace.runtimePath, 'Artifacts/MapDefinitions'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

async function mockHost(): Promise<void> {
  const bin = path.join(root, 'bin');
  await fs.mkdir(bin);
  await fs.writeFile(path.join(bin, process.platform === 'win32' ? 'func.exe' : 'func'), '', { mode: 0o755 });
  vi.stubEnv('PATH', bin);
  vi.stubEnv('ProgramFiles', '');
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    const callback = args[args.length - 1] as (error: Error | null, stdout: string, stderr: string) => void;
    callback(null, '--address', '');
    return {} as ReturnType<typeof execFile>;
  });
  vi.mocked(spawn).mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { pid: 987654, exitCode: null, signalCode: null });
    children.push(child);
    return child as unknown as ReturnType<typeof spawn>;
  });
  vi.spyOn(process, 'kill').mockReturnValue(true);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, body: { cancel: vi.fn() } }));
}

describe('LML runtime lifecycle', () => {
  it('is lazy, deduplicates per project, probes the host API and uses separate loopback arguments', async () => {
    await mockHost();
    const logger = vi.fn();
    manager = new LmlDesignTimeRuntimeManager(logger);
    expect(spawn).not.toHaveBeenCalled();
    const [first, second] = await Promise.all([manager.ensureStarted(root), manager.ensureStarted(path.join(root, '.'))]);
    expect(first).toEqual(second);
    expect(spawn).toHaveBeenCalledTimes(1);
    expect(spawn).toHaveBeenCalledWith(
      expect.stringMatching(/func(?:\.exe)?$/),
      ['host', 'start', '--port', String(first.port), '--address', '127.0.0.1'],
      expect.objectContaining({ cwd: first.runtimePath, shell: false, stdio: 'ignore', detached: process.platform !== 'win32' })
    );
    expect(fetch).toHaveBeenCalledWith(`${first.baseUrl}/runtime/webhooks/workflow/api/management/operationGroups`, expect.any(Object));
    expect(logger.mock.calls.flat()).toEqual(['Starting LML design-time runtime.', 'LML design-time runtime is ready.']);
    await manager.dispose();
    if (process.platform === 'win32') {
      expect(execFile).toHaveBeenCalledWith(
        expect.stringMatching(/taskkill\.exe$/),
        ['/pid', '987654', '/T', '/F'],
        expect.any(Object),
        expect.any(Function)
      );
    } else {
      expect(process.kill).toHaveBeenCalledWith(-987654, 'SIGKILL');
    }
    await expect(manager.ensureStarted(root)).rejects.toThrow('disposed');
  });

  it('fails with an actionable standalone prerequisite and does not create host files', async () => {
    vi.stubEnv('PATH', '');
    vi.stubEnv('ProgramFiles', '');
    manager = new LmlDesignTimeRuntimeManager();
    await expect(manager.ensureStarted(root)).rejects.toThrow('Install Azure Functions Core Tools v4');
    expect(spawn).not.toHaveBeenCalled();
    expect(await fs.readdir(root)).toEqual([]);
  });

  it('cleans up a startup failure and allows a subsequent retry without leaking output', async () => {
    await mockHost();
    await write('__generated/old.btm.xslt', 'BTM output');
    const logger = vi.fn();
    manager = new LmlDesignTimeRuntimeManager(logger);
    vi.mocked(fetch).mockImplementationOnce(async () => {
      children[0].emit('error', new Error('private-runtime-error'));
      throw new Error('private-response');
    });
    await expect(manager.ensureStarted(root)).rejects.toThrow('did not become ready');
    await expect(manager.ensureStarted(root)).resolves.toHaveProperty('baseUrl');
    expect(spawn).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(logger.mock.calls)).not.toContain('private');
    expect(await fs.readFile(path.join(root, '__generated/old.btm.xslt'), 'utf8')).toBe('BTM output');
  });

  it.each(['dispose', 'deadline'])('aborts pending probes on %s and cleans up', async (reason) => {
    await mockHost();
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    let probing!: () => void;
    const probeStarted = new Promise<void>((resolve) => {
      probing = resolve;
    });
    vi.mocked(fetch).mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
          probing();
        })
    );
    manager = new LmlDesignTimeRuntimeManager();
    const startup = manager.ensureStarted(root);
    const result = startup.catch((error: Error) => error);
    await probeStarted;
    if (reason === 'dispose') {
      await manager.dispose();
    } else {
      await vi.advanceTimersByTimeAsync(60000);
    }
    expect(await result).toBeInstanceOf(Error);
    expect(((await result) as Error).message).toContain('cancelled');
    expect(children).toHaveLength(1);
  });

  it('isolates projects and restarts a host that exits after readiness', async () => {
    await mockHost();
    manager = new LmlDesignTimeRuntimeManager();
    await fs.mkdir(path.join(root, 'second'));
    const first = await manager.ensureStarted(root);
    const second = await manager.ensureStarted(path.join(root, 'second'));
    expect(first.runtimePath).not.toBe(second.runtimePath);
    children[0].exitCode = 1;
    children[0].emit('exit', 1);
    await expect(manager.ensureStarted(root)).resolves.toHaveProperty('baseUrl');
    expect(spawn).toHaveBeenCalledTimes(3);
    expect(await manager.ensureStarted(path.join(root, 'second'))).toEqual(second);
  });

  it.runIf(process.platform === 'win32')('resolves an npm func.cmd shim to its native executable without a shell', async () => {
    await mockHost();
    const bin = path.join(root, 'bin');
    await fs.unlink(path.join(bin, 'func.exe'));
    const nativeDirectory = path.join(bin, 'node_modules/azure-functions-core-tools/bin');
    await fs.mkdir(nativeDirectory, { recursive: true });
    await fs.writeFile(path.join(bin, 'func.cmd'), '@echo off');
    await fs.writeFile(path.join(nativeDirectory, 'func.exe'), '');
    manager = new LmlDesignTimeRuntimeManager();
    await manager.ensureStarted(root);
    expect(vi.mocked(spawn).mock.calls[0][0]).toBe(path.join(nativeDirectory, 'func.exe'));
    expect(vi.mocked(spawn).mock.calls[0][2]).toMatchObject({ shell: false });
  });

  it('rejects Core Tools without the verified loopback binding option', async () => {
    await mockHost();
    vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
      const callback = args[args.length - 1] as (error: Error | null, stdout: string, stderr: string) => void;
      callback(null, '--port only', '');
      return {} as ReturnType<typeof execFile>;
    });
    manager = new LmlDesignTimeRuntimeManager();
    await expect(manager.ensureStarted(root)).rejects.toThrow('Install Azure Functions Core Tools');
    expect(spawn).not.toHaveBeenCalled();
  });
});
