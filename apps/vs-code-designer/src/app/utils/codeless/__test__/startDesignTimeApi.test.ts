import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Uri, window, workspace } from 'vscode';
import axios from 'axios';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import findProcess from 'find-process';
import * as os from 'os';
import { ext } from '../../../../extensionVariables';
import * as workspaceUtils from '../../workspace';
import { releaseReservedPort, reserveFreePort } from '../../portReservation';
import { getExperimentalBundleRuntime } from '../../bundleFeed';
import { ensureDesignTimeFiles, ensureProjectFiles } from '../../../projectConsistency/projectFilesConsistency';
import { isProjectConsistencyCheckEnabled } from '../../vsCodeConfig/settings';
import { startAllDesignTimeApis, startDesignTimeApi, startDesignTimeProcess, stopDesignTimeApi } from '../startDesignTimeApi';

vi.mock('../../appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
  getLocalSettingsSchema: vi.fn(() => ({ Values: {} })),
  getLocalSettingsJson: vi.fn(() => ({ IsEncrypted: false, Values: {} })),
}));

vi.mock('../../../projectConsistency/projectFilesConsistency', () => ({
  ensureLocalSettingsFile: vi.fn(),
  ensureHostFile: vi.fn(),
  // Preserve the existing failure-injection semantics: the design-time startup tests drive
  // success/failure through workspace.fs.createDirectory, so route the orchestrator through it.
  ensureProjectFiles: vi.fn(async (_context: unknown, projectPath: string) => {
    const designTimeDirectory = Uri.file(`${projectPath}/workflow-designtime`);
    await workspace.fs.createDirectory(designTimeDirectory);
    return designTimeDirectory;
  }),
  ensureDesignTimeFiles: vi.fn(async (_context: unknown, projectPath: string) => {
    const designTimeDirectory = Uri.file(`${projectPath}/workflow-designtime`);
    await workspace.fs.createDirectory(designTimeDirectory);
    return { changedArtifacts: [] };
  }),
}));

vi.mock('../../fs', () => ({
  writeFormattedJson: vi.fn(),
}));

vi.mock('../../bundleFeed', () => ({
  getExperimentalBundleRuntime: vi.fn(),
  ensureExtensionBundleHealthy: vi.fn(),
  isExtensionBundleDownloadInFlight: vi.fn(() => false),
  isInsideBundleDownloadScope: vi.fn(() => false),
  waitForExtensionBundleReady: vi.fn(),
}));

vi.mock('../common', () => ({
  updateFuncIgnore: vi.fn(),
}));

vi.mock('../../funcCoreTools/funcVersion', () => ({
  getFunctionsCommand: vi.fn(() => 'func'),
}));

vi.mock('../../vsCodeConfig/settings', () => ({
  getWorkspaceSetting: vi.fn(),
  updateGlobalSetting: vi.fn(),
  isManagedIdentityAuthEnabled: vi.fn(() => false),
  isProjectConsistencyCheckEnabled: vi.fn(() => true),
  useNodeDesignTimeWorker: vi.fn(() => false),
}));

vi.mock('../../../commands/pickFuncProcess', () => ({
  findChildProcess: vi.fn(),
}));

vi.mock('../../findChildProcess/findChildProcess', () => ({
  getChildProcesses: vi.fn(),
}));

vi.mock('axios', () => ({
  default: {
    get: vi.fn(),
  },
  get: vi.fn(),
}));

vi.mock('find-process', () => ({
  default: vi.fn(),
}));

vi.mock('../../workspace', () => ({
  getWorkspaceLogicAppRoots: vi.fn(),
}));

vi.mock('../../portReservation', () => ({
  reserveFreePort: vi.fn(),
  releaseReservedPort: vi.fn(),
  resetReservedPorts: vi.fn(),
}));

describe('startAllDesignTimeApis', () => {
  const createMockContext = () =>
    ({
      telemetry: { properties: {}, measurements: {} },
      errorHandling: { rethrow: false, suppressDisplay: false },
      ui: {},
      valuesToMask: [],
    }) as any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getExperimentalBundleRuntime).mockReset();
    vi.mocked(isProjectConsistencyCheckEnabled).mockReturnValue(true);
    ext.designTimeInstances.clear();
    (workspace as any).workspaceFolders = [];
    workspace.fs.createDirectory = vi.fn().mockRejectedValue(new Error('skip startup after logging')) as any;
    vi.mocked(window.showErrorMessage).mockResolvedValue(undefined as any);
    vi.mocked(axios.get).mockRejectedValue(new Error('API not ready'));
    let nextPort = 7071;
    vi.mocked(reserveFreePort).mockImplementation(async () => nextPort++);
  });

  it.each([undefined, 'http://127.0.0.1:12345/previous-selection'])(
    'does not reuse or terminate an experimental host with unknown/stale selection %s',
    async (previousSource) => {
      const source = 'http://127.0.0.1:12345/current-selection';
      vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
        directory: 'synthetic-cache',
        folderVersion: '1.197.13',
        manifestVersion: '1.197.0.13',
        env: { FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: source },
      });
      ext.designTimeInstances.set('D:/workspace/app-one', {
        port: 7071,
        process: { pid: 111 } as cp.ChildProcess,
        experimentalBundleSource: previousSource,
      });
      vi.mocked(axios.get).mockResolvedValue({});
      await expect(startDesignTimeApi(createMockContext(), 'D:/workspace/app-one')).rejects.toThrow('was not launched with');
      expect(cp.spawn).not.toHaveBeenCalled();
      expect(cp.exec).not.toHaveBeenCalled();
      expect(ext.designTimeInstances.get('D:/workspace/app-one')?.isStarting).toBe(false);
    }
  );

  it('creates only required design-time files when project consistency checks are disabled', async () => {
    vi.mocked(isProjectConsistencyCheckEnabled).mockReturnValue(false);

    await expect(startDesignTimeApi(createMockContext(), 'D:/workspace/app-one')).rejects.toThrow('skip startup after logging');

    expect(ensureProjectFiles).not.toHaveBeenCalled();
    expect(ensureDesignTimeFiles).toHaveBeenCalledWith(expect.any(Object), 'D:/workspace/app-one');
  });

  it('reuses a healthy tracked host launched with the same experimental selection', async () => {
    const source = 'http://127.0.0.1:12345/current-selection';
    vi.mocked(getExperimentalBundleRuntime).mockResolvedValue({
      directory: 'synthetic-cache',
      folderVersion: '1.197.13',
      manifestVersion: '1.197.0.13',
      env: { FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: source },
    });
    vi.mocked(os.platform).mockReturnValue('linux');
    ext.designTimeInstances.set('D:/workspace/experimental-app', {
      port: 7071,
      process: { pid: 111 } as cp.ChildProcess,
      childFuncPid: '222',
      experimentalBundleSource: source,
    });
    vi.mocked(axios.get).mockResolvedValue({});
    vi.mocked(findProcess).mockResolvedValue([{ pid: 222, name: 'func', ppid: 111, cmd: 'func host start' }]);
    await startDesignTimeApi(createMockContext(), 'D:/workspace/experimental-app');
    expect(cp.spawn).not.toHaveBeenCalled();
  });

  it('does not probe or launch a host if its selected experimental bundle is invalid', async () => {
    vi.mocked(getExperimentalBundleRuntime).mockRejectedValue(new Error('selected bundle invalid'));
    await expect(startDesignTimeApi(createMockContext(), 'D:/workspace/app-one')).rejects.toThrow('selected bundle invalid');
    expect(axios.get).not.toHaveBeenCalled();
    expect(cp.spawn).not.toHaveBeenCalled();
  });

  it('logs zero-project startup when the workspace contains no Logic App folders', async () => {
    (workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:/workspace' } }];
    vi.mocked(workspaceUtils.getWorkspaceLogicAppRoots).mockResolvedValue([]);

    await startAllDesignTimeApis();

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'No Logic App projects found in the current workspace, skipping design-time startup.'
    );
    expect(reserveFreePort).not.toHaveBeenCalled();
  });

  it('starts each Logic App project discovered in the workspace', async () => {
    (workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:/workspace' } }];
    vi.mocked(workspaceUtils.getWorkspaceLogicAppRoots).mockResolvedValue(['D:/workspace/app-one', 'D:/workspace/app-two']);

    // startDesignTimeApi will throw due to the beforeEach createDirectory mock rejecting,
    // but startAllDesignTimeApis wraps each call in callWithTelemetryAndErrorHandling which
    // (in production) catches errors. The test mock is a passthrough, so we catch here.
    await startAllDesignTimeApis().catch(() => {});

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Starting design-time processes for 2 Logic App project(s) in the current workspace.'
    );
    expect(reserveFreePort).toHaveBeenCalledTimes(2);

    const portOne = ext.designTimeInstances.get('D:/workspace/app-one')?.port;
    const portTwo = ext.designTimeInstances.get('D:/workspace/app-two')?.port;
    expect(portOne).toBeDefined();
    expect(portTwo).toBeDefined();
    expect(portOne).not.toBe(portTwo);
  });

  it('rejects when Logic App folder discovery fails', async () => {
    (workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:/workspace' } }];
    vi.mocked(workspaceUtils.getWorkspaceLogicAppRoots).mockRejectedValue(new Error('folder discovery failed'));

    await expect(startAllDesignTimeApis()).rejects.toThrow('folder discovery failed');
  });

  it('cleans up startup state after a startup failure', async () => {
    await expect(startDesignTimeApi(createMockContext(), 'D:/workspace/app-one')).rejects.toThrow();

    const designTimeInstance = ext.designTimeInstances.get('D:/workspace/app-one');

    expect(designTimeInstance).toEqual(
      expect.objectContaining({
        isStarting: false,
        startupError: expect.stringContaining('skip startup after logging'),
      })
    );
    expect(designTimeInstance?.startupPromise).toBeUndefined();
  });

  it('restarts design-time when process validation detects an invalid func process', async () => {
    // Simulate: first port has an orphan responding (isDesignTimeUp true, but no tracked process),
    // after restart the new port has nothing responding so full startup path runs (and fails due
    // to the default createDirectory rejection mock). This verifies the restart logic works without
    // entering an infinite loop.
    vi.mocked(axios.get)
      .mockResolvedValueOnce({} as any) // first port: orphan responds
      .mockRejectedValue(new Error('API not ready')); // new port: nothing responding

    await expect(startDesignTimeApi(createMockContext(), 'D:/workspace/app-one')).rejects.toThrow();

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Invalid func child process PID set for project at "D:/workspace/app-one". Restarting workflow design-time API.'
    );
    // reserveFreePort called twice: once for first attempt, once for restart
    expect(reserveFreePort).toHaveBeenCalledTimes(2);
  });

  it('stops retrying process validation after exceeding max retry limit', async () => {
    // Simulate: orphan responds on every port (pathological case).
    // The retry limit prevents infinite recursion.
    vi.mocked(axios.get).mockResolvedValue({} as any);

    await startDesignTimeApi(createMockContext(), 'D:/workspace/app-one');

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(expect.stringContaining('Unable to validate the func child process PID'));
  });

  it('reuses the in-flight startup promise for concurrent calls on the same project', async () => {
    let rejectCreateDirectory: ((error: Error) => void) | undefined;
    const createDirectoryPromise = new Promise<void>((_resolve, reject) => {
      rejectCreateDirectory = reject;
    });
    workspace.fs.createDirectory = vi.fn().mockReturnValue(createDirectoryPromise) as any;

    const firstStart = startDesignTimeApi(createMockContext(), 'D:/workspace/app-one');
    const secondStart = startDesignTimeApi(createMockContext(), 'D:/workspace/app-one');

    expect(reserveFreePort).toHaveBeenCalledTimes(1);

    rejectCreateDirectory?.(new Error('startup still failed'));
    await expect(firstStart).rejects.toThrow('startup still failed');
    await expect(secondStart).rejects.toThrow('startup still failed');

    const designTimeInstance = ext.designTimeInstances.get('D:/workspace/app-one');
    expect(designTimeInstance?.startupPromise).toBeUndefined();
    expect(designTimeInstance?.startupError).toContain('startup still failed');
  });

  it('does not restart a running linux design-time host when the tracked child func process is valid', async () => {
    vi.mocked(os.platform).mockReturnValue('linux' as any);
    ext.designTimeInstances.set('D:/workspace/app-one', { port: 7071, process: { pid: 111 } as any, childFuncPid: '222' });
    vi.mocked(axios.get).mockResolvedValueOnce({} as any);
    vi.mocked(findProcess).mockImplementation(async (_query, pid) => (Number(pid) === 222 ? [{ name: 'func' }] : [{ name: 'sh' }]) as any);

    await startDesignTimeApi(createMockContext(), 'D:/workspace/app-one');

    expect(reserveFreePort).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).not.toHaveBeenCalledWith(
      'Invalid func child process PID set for project at "D:/workspace/app-one". Restarting workflow design-time API.'
    );
  });

  it('kills both the tracked child and wrapper shell on linux when stopping design time', async () => {
    vi.mocked(os.platform).mockReturnValue('linux' as any);
    vi.mocked(cp.spawn).mockReturnValue({} as any);
    ext.designTimeInstances.set('D:/workspace/app-one', { process: { pid: 111 } as any, childFuncPid: '222' });

    await stopDesignTimeApi('D:/workspace/app-one');

    expect(cp.spawn).toHaveBeenCalledWith('kill', ['-9', '222']);
    expect(cp.spawn).toHaveBeenCalledWith('kill', ['-9', '111']);
  });

  it('releases the reserved port when stopping a design-time host so it can be reused', async () => {
    vi.mocked(os.platform).mockReturnValue('linux' as any);
    vi.mocked(cp.spawn).mockReturnValue({} as any);
    ext.designTimeInstances.set('D:/workspace/app-one', { port: 7071, process: { pid: 111 } as any, childFuncPid: '222' });

    await stopDesignTimeApi('D:/workspace/app-one');

    expect(releaseReservedPort).toHaveBeenCalledWith(7071);
  });

  it('waits for Windows taskkill callbacks before resolving stopDesignTimeApi', async () => {
    vi.mocked(os.platform).mockReturnValue('win32' as any);
    const taskkillCallbacks: Array<() => void> = [];
    vi.spyOn(cp, 'exec').mockImplementation(((command: string, callback?: cp.ExecException | any) => {
      taskkillCallbacks.push(() => callback?.(null, '', ''));
      return {} as cp.ChildProcess;
    }) as any);
    ext.designTimeInstances.set('D:/workspace/app-one', { process: { pid: 111 } as any, childFuncPid: '222' });

    let resolved = false;
    const stopPromise = stopDesignTimeApi('D:/workspace/app-one').then(() => {
      resolved = true;
    });
    await Promise.resolve();

    expect(cp.exec).toHaveBeenCalledWith('taskkill /pid 222 /t /f', expect.any(Function));
    expect(cp.exec).toHaveBeenCalledWith('taskkill /pid 111 /t /f', expect.any(Function));
    expect(resolved).toBe(false);

    taskkillCallbacks[0]();
    await Promise.resolve();
    expect(resolved).toBe(false);

    taskkillCallbacks[1]();
    await stopPromise;
    expect(resolved).toBe(true);
  });

  it('passes string child func pids to taskkill on Windows', async () => {
    vi.mocked(os.platform).mockReturnValue('win32' as any);
    vi.spyOn(cp, 'exec').mockImplementation(((_command: string, callback?: cp.ExecException | any) => {
      callback?.(null, '', '');
      return {} as cp.ChildProcess;
    }) as any);
    ext.designTimeInstances.set('D:/workspace/app-one', { process: { pid: 111 } as any, childFuncPid: '12345' });

    await stopDesignTimeApi('D:/workspace/app-one');

    expect(cp.exec).toHaveBeenCalledWith('taskkill /pid 12345 /t /f', expect.any(Function));
    expect(cp.exec).toHaveBeenCalledWith('taskkill /pid 111 /t /f', expect.any(Function));
  });

  it('skips taskkill when the tracked pid is undefined on Windows', async () => {
    vi.mocked(os.platform).mockReturnValue('win32' as any);
    vi.spyOn(cp, 'exec').mockImplementation(((_command: string, callback?: cp.ExecException | any) => {
      callback?.(null, '', '');
      return {} as cp.ChildProcess;
    }) as any);
    ext.designTimeInstances.set('D:/workspace/app-one', { process: {} as any });

    await expect(stopDesignTimeApi('D:/workspace/app-one')).resolves.toBeUndefined();

    expect(cp.exec).not.toHaveBeenCalled();
  });
});

describe('startDesignTimeProcess', () => {
  let stdout: EventEmitter;
  let stderr: EventEmitter;
  let outputChannel: { append: ReturnType<typeof vi.fn>; appendLog: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    ext.designTimeInstances.clear();
    stdout = new EventEmitter();
    stderr = new EventEmitter();
    outputChannel = {
      append: vi.fn(),
      appendLog: vi.fn(),
    };
    vi.mocked(cp.spawn).mockReturnValue({
      pid: 1234,
      stdout,
      stderr,
    } as any);
  });

  it('passes experimental binding only to the owned child environment and preserves inherited values', () => {
    const before = process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
    const environment = {
      FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'http://127.0.0.1:12345/synthetic-selection',
      AzureFunctionsJobHost__extensionBundle__version: '[1.197.13]',
    };
    startDesignTimeProcess(outputChannel as any, 'synthetic-designtime', 'func', ['host', 'start'], environment);
    expect(cp.spawn).toHaveBeenCalledWith('func', ['host', 'start'], expect.objectContaining({ env: { ...process.env, ...environment } }));
    expect(process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI).toBe(before);
  });

  it('keeps production spawn environment inheritance unchanged', () => {
    startDesignTimeProcess(outputChannel as any, 'synthetic-designtime', 'func', ['host', 'start']);
    expect(cp.spawn).toHaveBeenCalledWith('func', ['host', 'start'], { cwd: 'synthetic-designtime', shell: true });
  });

  it('suppresses repeated failing health-check output while preserving other host output', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', ['host', 'start']);

    stderr.emit('data', '[10:00:00] Health check failed: service is unhealthy\n');
    stderr.emit('data', '[10:00:01] Health check failed: service is unhealthy\n');
    stderr.emit('data', '[10:00:02] Health check failed: service is unhealthy\n');
    stderr.emit('data', 'A real startup error happened\n');

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain('[10:00:00] Health check failed: service is unhealthy\n');
    expect(appendedOutput).toContain('[Azure Logic Apps] Repeated failing health-check output suppressed.\n');
    expect(appendedOutput).toContain('A real startup error happened\n');
    expect(appendedOutput).not.toContain('[10:00:01] Health check failed: service is unhealthy\n');
    expect(appendedOutput).not.toContain('[10:00:02] Health check failed: service is unhealthy\n');
  });

  it('suppresses repeated failing health-check output across chunked stdout lines', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', ['host', 'start']);

    stdout.emit('data', 'Health ');
    stdout.emit('data', 'check failed: service is unhealthy\n');
    stdout.emit('data', 'Health check failed: service is unhealthy\n');
    stdout.emit('data', 'Host started\n');

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain('Health check failed: service is unhealthy\n');
    expect(appendedOutput).toContain('[Azure Logic Apps] Repeated failing health-check output suppressed.\n');
    expect(appendedOutput).toContain('Host started\n');
  });

  it('normalizes Functions host health-check invocation ids and durations before suppressing repeats', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', ['host', 'start']);

    stderr.emit('data', "Executed 'Functions.HealthCheck' (Failed, Id=11111111-1111-1111-1111-111111111111, Duration=12ms)\n");
    stderr.emit('data', "Executed 'Functions.HealthCheck' (Failed, Id=22222222-2222-2222-2222-222222222222, Duration=48ms)\n");

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain("Executed 'Functions.HealthCheck' (Failed, Id=11111111-1111-1111-1111-111111111111, Duration=12ms)\n");
    expect(appendedOutput).toContain('[Azure Logic Apps] Repeated failing health-check output suppressed.\n');
    expect(appendedOutput).not.toContain('22222222-2222-2222-2222-222222222222');
  });

  it('suppresses repeated process unhealthy logs with health-check entries', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', ['host', 'start']);

    const healthCheckEntries =
      'Process reporting unhealthy: Unhealthy. Health check entries are {"azure.functions.web_host.lifecycle":{"status":"Healthy","description":null},"azure.functions.script_host.lifecycle":{"status":"Healthy","description":null},"azure.functions.webjobs.storage":{"status":"Unhealthy","description":"Unable to create client for AzureWebJobsStorage"}}\n';

    stderr.emit('data', healthCheckEntries);
    stderr.emit('data', healthCheckEntries);

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain(healthCheckEntries);
    expect(appendedOutput).toContain('[Azure Logic Apps] Repeated failing health-check output suppressed.\n');
    expect(appendedOutput.indexOf(healthCheckEntries)).toBe(appendedOutput.lastIndexOf(healthCheckEntries));
  });

  it('flushes final unterminated output when a host stream closes', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', ['host', 'start']);

    stderr.emit('data', 'A real startup error without newline');
    stderr.emit('close');

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain('A real startup error without newline');
  });

  it('keeps stdout and stderr partial-line buffers independent', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', ['host', 'start']);

    stdout.emit('data', 'Health ');
    stderr.emit('data', 'A real startup error\n');
    stdout.emit('data', 'check failed: service is unhealthy\n');

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain('A real startup error\n');
    expect(appendedOutput).toContain('Health check failed: service is unhealthy\n');
    expect(appendedOutput).not.toContain('Health A real startup error');
  });

  it('does not suppress unrelated output or existing restart-trigger diagnostics', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', ['host', 'start']);

    stdout.emit('data', 'Failed to start a new language worker for runtime: node\n');
    stderr.emit('data', 'Port 7071 is unavailable. Close the process using that port, or specify another port using --port.\n');

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain('Failed to start a new language worker for runtime: node\n');
    expect(appendedOutput).toContain('Port 7071 is unavailable.');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Language worker issue found when launching func most likely due to a conflicting port. Restarting design-time process.'
    );
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Conflicting port found when launching func. Restarting design-time process.');
  });
});
