import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Uri, window, workspace } from 'vscode';
import axios from 'axios';
import * as cp from 'child_process';
import { EventEmitter } from 'events';
import findProcess from 'find-process';
import * as os from 'os';
import * as productFs from 'fs';
import * as path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
const diagnosticFs = await vi.importActual<typeof import('node:fs')>('node:fs');
const diagnosticOs = await vi.importActual<typeof import('node:os')>('node:os');
import { ext } from '../../../../extensionVariables';
import * as workspaceUtils from '../../workspace';
import { releaseReservedPort, reserveFreePort } from '../../portReservation';
import {
  startAllDesignTimeApis,
  startDesignTimeApi,
  startDesignTimeProcess,
  stopDesignTimeApi,
  stopAllDesignTimeApis,
  waitForDesignTimeStartUp,
} from '../startDesignTimeApi';
import { findChildProcess } from '../../../commands/pickFuncProcess';
import { emitDesignTimeDiagnostic, startDesignTimeDiagnostic, finishDesignTimeDiagnostic } from '../designTimeDiagnostics';
import { warnIfJdbcJavaRuntimeMissing } from '../../java/jdbcConnector';
import { ensureExtensionBundleHealthy } from '../../bundleFeed';

vi.mock('../../bundleFeed', () => ({
  ensureExtensionBundleHealthy: vi.fn().mockResolvedValue(undefined),
  isExtensionBundleDownloadInFlight: vi.fn(() => false),
  isInsideBundleDownloadScope: vi.fn(() => false),
  waitForExtensionBundleReady: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../java/jdbcConnector', () => ({
  warnIfJdbcJavaRuntimeMissing: vi.fn().mockResolvedValue(undefined),
}));

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
}));

vi.mock('../../fs', () => ({
  writeFormattedJson: vi.fn(),
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
    ext.designTimeInstances.clear();
    (workspace as any).workspaceFolders = [];
    workspace.fs.createDirectory = vi.fn().mockRejectedValue(new Error('skip startup after logging')) as any;
    vi.mocked(window.showErrorMessage).mockResolvedValue(undefined as any);
    vi.mocked(axios.get).mockRejectedValue(new Error('API not ready'));
    let nextPort = 7071;
    vi.mocked(reserveFreePort).mockImplementation(async () => nextPort++);
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

  it('preserves tracked child and wrapper shell cleanup on macOS', async () => {
    vi.mocked(os.platform).mockReturnValue('darwin');
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

describe('Linux design-time process-group ownership', () => {
  const project = path.resolve('owned-design-time-project');
  const workdir = path.join(project, 'workflow-designtime');
  const context = () => ({ telemetry: { properties: {}, measurements: {} }, errorHandling: {} }) as any;
  const nativeKill = process.kill.bind(process);
  let child: cp.ChildProcess;

  const launch = () => {
    ext.designTimeInstances.set(project, {});
    startDesignTimeProcess(undefined, workdir, 'private-func', 'host', 'start', '--port 7071');
    return ext.designTimeInstances.get(project)!;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ext.designTimeInstances.clear();
    vi.mocked(os.platform).mockReturnValue('linux');
    child = Object.assign(new EventEmitter(), { pid: 20457, exitCode: null, signalCode: null }) as cp.ChildProcess;
    vi.mocked(cp.spawn).mockReturnValue(child);
    vi.spyOn(process, 'kill').mockImplementation(() => {
      child.emit('exit', null, 'SIGKILL');
      return true;
    });
    vi.mocked(reserveFreePort).mockResolvedValue(7071);
    vi.mocked(warnIfJdbcJavaRuntimeMissing).mockResolvedValue(undefined);
    vi.mocked(ensureExtensionBundleHealthy).mockResolvedValue(undefined);
    workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    ext.designTimeInstances.clear();
  });

  it('stops the owned group while startup is pending and childFuncPid is absent, excluding foreign groups', async () => {
    let resolveStartup!: () => void;
    const startupPromise = new Promise<void>((resolve) => {
      resolveStartup = resolve;
    });
    const instance = launch();
    instance.startupPromise = startupPromise;
    const liveGroups = new Map([
      [20457, 20457], // shell
      [20460, 20457], // launcher
      [20503, 20457], // worker
      [30001, 30001], // unrelated process
      [process.pid, process.pid], // extension host
    ]);
    vi.mocked(process.kill).mockImplementation((pid, signal) => {
      expect(signal).toBe('SIGKILL');
      for (const [member, group] of liveGroups) {
        if (group === -Number(pid)) liveGroups.delete(member);
      }
      child.emit('exit', null, 'SIGKILL');
      return true;
    });

    await stopAllDesignTimeApis();

    expect(instance.childFuncPid).toBeUndefined();
    expect(instance.startupPromise).toBe(startupPromise);
    expect(process.kill).toHaveBeenCalledExactlyOnceWith(-20457, 'SIGKILL');
    expect([...liveGroups.keys()]).toEqual([30001, process.pid]);
    expect(ext.designTimeInstances.size).toBe(0);
    expect(cp.spawn).toHaveBeenCalledExactlyOnceWith('private-func', ['host', 'start', '--port 7071'], {
      cwd: workdir,
      shell: true,
      detached: true,
    });
    expect(findProcess).not.toHaveBeenCalled();
    expect(findChildProcess).not.toHaveBeenCalled();
    resolveStartup();
  });

  it('ignores a foreign discovered child PID and waits for the owned child exit, not pipe close', async () => {
    launch().childFuncPid = '30001';
    vi.mocked(process.kill).mockReturnValue(true);
    let settled = false;
    const stopping = stopDesignTimeApi(project).then(() => {
      settled = true;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    expect(process.kill).toHaveBeenCalledExactlyOnceWith(-20457, 'SIGKILL');
    child.emit('exit', null, 'SIGKILL');
    await stopping;
    expect(settled).toBe(true);
    expect(child.listenerCount('exit')).toBe(0);
  });

  it('stops an actual in-flight startup before child discovery without waiting for readiness', async () => {
    let ready!: (value: unknown) => void;
    vi.mocked(axios.get)
      .mockRejectedValueOnce(new Error('not ready'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            ready = resolve;
          })
      );
    const startup = startDesignTimeApi(context(), project);
    const outcome = startup.catch((error) => error);
    await vi.waitFor(() => expect(ready).toBeTypeOf('function'));
    const instance = ext.designTimeInstances.get(project)!;
    expect(instance.process).toBe(child);
    expect(instance.startupPromise).toBeDefined();
    expect(instance.childFuncPid).toBeUndefined();
    expect(findChildProcess).not.toHaveBeenCalled();

    await stopAllDesignTimeApis();

    expect(process.kill).toHaveBeenCalledExactlyOnceWith(-20457, 'SIGKILL');
    expect(ext.designTimeInstances.size).toBe(0);
    // Let the pre-existing startup continuation settle; this is not a new
    // cancellation policy or a late-spawn correction.
    ready({});
    expect((await outcome).message).toContain('Design-time startup state was lost');
    expect(cp.spawn).toHaveBeenCalledTimes(1);
    expect(findChildProcess).not.toHaveBeenCalled();
  });

  it('rejects an exited leader rather than signaling a potentially reused process-group number', async () => {
    launch();
    Object.assign(child, { exitCode: 0 });
    vi.mocked(process.kill).mockReturnValue(true);
    await expect(stopDesignTimeApi(project)).rejects.toThrow('Cannot verify a live Linux design-time process-group leader');
    expect(process.kill).not.toHaveBeenCalled();
  });

  it.each([undefined, 0, -1, 1, NaN, process.pid])('does not authorize an unsafe or absent spawn PID: %s', async (pid) => {
    Object.assign(child, { pid });
    launch().childFuncPid = '30001';
    await stopDesignTimeApi(project);
    expect(process.kill).not.toHaveBeenCalled();
    expect(cp.spawn).toHaveBeenCalledTimes(1);
  });

  it('does not trust an unmarked ChildProcess with a copied PID or stale FuncInstance child PID', async () => {
    launch();
    ext.designTimeInstances.set(project, { process: { pid: child.pid } as cp.ChildProcess, childFuncPid: '30001' });
    await stopDesignTimeApi(project);
    expect(process.kill).not.toHaveBeenCalled();
    expect(cp.spawn).toHaveBeenCalledTimes(1);
  });

  it('does not trust a changed PID on the marked child', async () => {
    launch();
    Object.assign(child, { pid: 30001 });
    await stopDesignTimeApi(project);
    expect(process.kill).not.toHaveBeenCalled();
  });

  it('consumes ownership so reinserting the same old child cannot replay a group kill', async () => {
    launch();
    await stopDesignTimeApi(project);
    ext.designTimeInstances.set(project, { process: child, childFuncPid: '30001' });
    await stopDesignTimeApi(project);
    expect(process.kill).toHaveBeenCalledExactlyOnceWith(-20457, 'SIGKILL');
  });

  it('treats ESRCH as already absent without any fallback kill or exit wait', async () => {
    launch();
    vi.mocked(process.kill).mockImplementation(() => {
      throw Object.assign(new Error('gone'), { code: 'ESRCH' });
    });
    await expect(stopDesignTimeApi(project)).resolves.toBeUndefined();
    expect(process.kill).toHaveBeenCalledExactlyOnceWith(-20457, 'SIGKILL');
    expect(cp.spawn).toHaveBeenCalledTimes(1);
    expect(child.listenerCount('exit')).toBe(0);
  });

  it.each(['EPERM', 'ENOSYS'])('propagates unavailable group cleanup (%s) without falling back to foreign PIDs', async (code) => {
    launch().childFuncPid = '30001';
    const failure = Object.assign(new Error('group kill failed'), { code });
    vi.mocked(process.kill).mockImplementation(() => {
      throw failure;
    });
    await expect(stopDesignTimeApi(project)).rejects.toBe(failure);
    expect(cp.spawn).toHaveBeenCalledTimes(1);
    expect(child.listenerCount('exit')).toBe(0);
  });

  it('bounds the exit wait after a successful signal and removes its listener', async () => {
    vi.useFakeTimers();
    launch();
    vi.mocked(process.kill).mockReturnValue(true);
    const stopping = expect(stopDesignTimeApi(project)).rejects.toThrow('Timed out waiting for the Linux design-time process');
    await vi.advanceTimersByTimeAsync(5000);
    await stopping;
    expect(child.listenerCount('exit')).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([false, true])('preserves the original post-spawn startup failure when cleanup fails: %s', async (cleanupFails) => {
    const primary = new Error('original startup failure');
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('not ready')).mockResolvedValue({});
    vi.mocked(findChildProcess).mockResolvedValue('30001');
    vi.mocked(productFs.readFileSync).mockImplementation(() => {
      throw primary;
    });
    if (cleanupFails) {
      vi.mocked(process.kill).mockImplementation(() => {
        throw Object.assign(new Error('secondary'), { code: 'EPERM' });
      });
    }
    await expect(startDesignTimeApi(context(), project)).rejects.toBe(primary);
    expect(process.kill).toHaveBeenCalledExactlyOnceWith(-20457, 'SIGKILL');
    expect(ext.designTimeInstances.get(project)).toMatchObject({ startupError: primary.message, isStarting: false });
    expect(ext.designTimeInstances.get(project)?.process).toBeUndefined();
    expect(ext.designTimeInstances.get(project)?.startupPromise).toBeUndefined();
  });

  it('awaits child exit on startup failure before rethrowing the original failure', async () => {
    const primary = new Error('original startup failure');
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('not ready')).mockResolvedValue({});
    vi.mocked(findChildProcess).mockResolvedValue('30001');
    vi.mocked(productFs.readFileSync).mockImplementation(() => {
      throw primary;
    });
    vi.mocked(process.kill).mockReturnValue(true);
    const startup = startDesignTimeApi(context(), project);
    const rejection = expect(startup).rejects.toBe(primary);
    await vi.waitFor(() => expect(process.kill).toHaveBeenCalled());
    expect(ext.designTimeInstances.get(project)?.startupPromise).toBeDefined();
    child.emit('exit', null, 'SIGKILL');
    await rejection;
    expect(ext.designTimeInstances.get(project)?.startupPromise).toBeUndefined();
  });

  it.each(['win32', 'darwin'] as const)('does not detach or change launch args on %s', (platform) => {
    vi.mocked(os.platform).mockReturnValue(platform);
    launch();
    expect(cp.spawn).toHaveBeenCalledExactlyOnceWith('private-func', ['host', 'start', '--port 7071'], { cwd: workdir, shell: true });
    expect(process.kill).not.toHaveBeenCalled();
  });

  it.skipIf(diagnosticOs.platform() !== 'linux')('kills real Linux owned descendants but leaves a foreign process alive', async () => {
    const nativeCp = await vi.importActual<typeof import('node:child_process')>('node:child_process');
    vi.mocked(process.kill).mockImplementation(nativeKill);
    vi.mocked(cp.spawn).mockImplementation(nativeCp.spawn);
    const foreign = nativeCp.spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { detached: true, stdio: 'ignore' });
    let owned: cp.ChildProcess | undefined;
    try {
      // The launcher and worker inherit the detached shell's group. All observed
      // PIDs come directly from this control, not name/global process scans.
      const workerCode = 'setInterval(() => {}, 1000)';
      const launcherCode = `const c=require("child_process").spawn(process.execPath,["-e",${JSON.stringify(workerCode)}],{stdio:"ignore"});console.log(JSON.stringify([process.pid,c.pid]));setInterval(()=>{},1000)`;
      const actualProject = path.dirname(diagnosticOs.tmpdir());
      ext.designTimeInstances.set(actualProject, { startupPromise: new Promise(() => {}) });
      startDesignTimeProcess(undefined, diagnosticOs.tmpdir(), process.execPath, '-e', `'${launcherCode}'`);
      owned = vi.mocked(cp.spawn).mock.results.at(-1)!.value;
      expect(ext.designTimeInstances.get(actualProject)?.process).toBe(owned);
      let output = '';
      owned!.stdout!.on('data', (data) => {
        output += data.toString();
      });
      await vi.waitFor(() => expect(output).toContain('\n'), { timeout: 2000, interval: 20 });
      const descendants = JSON.parse(output.trim()) as number[];
      expect(descendants).toHaveLength(2);
      for (const pid of descendants) {
        const stat = diagnosticFs.readFileSync(`/proc/${pid}/stat`, 'utf8');
        const fields = stat
          .slice(stat.lastIndexOf(')') + 1)
          .trim()
          .split(/\s+/);
        expect(Number(fields[2])).toBe(owned!.pid); // process group
        expect(Number(fields[3])).toBe(owned!.pid); // session
      }
      const isLive = (pid: number) => {
        try {
          const stat = diagnosticFs.readFileSync(`/proc/${pid}/stat`, 'utf8');
          return !/^\s*[ZX]\b/.test(stat.slice(stat.lastIndexOf(')') + 1));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
          throw error;
        }
      };
      expect(descendants.every(isLive)).toBe(true);
      await stopDesignTimeApi(actualProject);
      await vi.waitFor(() => expect(descendants.some(isLive)).toBe(false), { timeout: 2000, interval: 20 });
      expect(nativeKill(foreign.pid!, 0)).toBe(true);
      expect(vi.mocked(process.kill).mock.calls).toEqual([[-owned!.pid!, 'SIGKILL']]);
    } finally {
      for (const proc of [owned, foreign]) {
        if (!proc?.pid) continue;
        try {
          nativeKill(-proc.pid, 'SIGKILL');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
        await vi.waitFor(() => expect(proc.exitCode !== null || proc.signalCode !== null).toBe(true), { timeout: 1000, interval: 20 });
      }
    }
  });
});

describe('isolated MultiRoot design-time owning receipts', () => {
  let directory: string;
  let file: string;
  let project: string;
  const context = () =>
    ({
      telemetry: { properties: {}, measurements: {} },
      errorHandling: {},
    }) as any;
  const digest = (value: string) => createHash('sha256').update(value).digest('hex');
  const receipts = () =>
    diagnosticFs
      .readFileSync(file, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));

  beforeEach(() => {
    vi.clearAllMocks();
    ext.designTimeInstances.clear();
    directory = diagnosticFs.mkdtempSync(path.join(diagnosticOs.tmpdir(), 'la-design-owning-'));
    project = path.join(directory, 'private-project');
    const invocation = randomUUID();
    file = path.join(directory, `${invocation}.design-time.jsonl`);
    vi.stubEnv('VSCODE_RUNNING_TESTS', '');
    vi.stubEnv('LA_E2E_CLI_MULTI_ROOT_ISOLATED', '1');
    vi.stubEnv('LA_E2E_LIFECYCLE_DIR', directory);
    vi.stubEnv('LA_E2E_LIFECYCLE_INVOCATION', invocation);
    vi.stubEnv('LA_E2E_CLI_MULTI_ROOT_EVENTS', path.join(directory, 'debug-events.jsonl'));
    vi.mocked(os.platform).mockReturnValue('linux');
    const spawned = Object.assign(new EventEmitter(), { pid: 23035, exitCode: null, signalCode: null });
    vi.mocked(cp.spawn).mockReturnValue(spawned as any);
    vi.spyOn(process, 'kill').mockImplementation(() => {
      spawned.emit('exit', null, 'SIGKILL');
      return true;
    });
    vi.mocked(reserveFreePort).mockResolvedValue(7071);
    vi.mocked(axios.get).mockRejectedValue(new Error('not ready'));
    vi.mocked(findChildProcess).mockResolvedValue('23080');
    vi.mocked(warnIfJdbcJavaRuntimeMissing).mockResolvedValue(undefined);
    vi.mocked(ensureExtensionBundleHealthy).mockResolvedValue(undefined);
    workspace.fs.createDirectory = vi.fn().mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    diagnosticFs.rmSync(directory, { recursive: true, force: true });
    ext.designTimeInstances.clear();
  });

  it('does not perform IO or evaluate snapshots outside the exact admitted environment', () => {
    vi.stubEnv('LA_E2E_CLI_MULTI_ROOT_ISOLATED', '0');
    const inspect = vi.fn(() => {
      throw new Error('must never inspect');
    });
    emitDesignTimeDiagnostic('design-time-stop', inspect);
    const span = startDesignTimeDiagnostic('design-time-spawn', inspect);
    finishDesignTimeDiagnostic(span, inspect, { error: undefined });
    ext.designTimeInstances.set(project, {});
    startDesignTimeProcess(undefined, path.join(project, 'workflow-designtime'), 'func');
    expect(span).toBeUndefined();
    expect(inspect).not.toHaveBeenCalled();
    expect(productFs.realpathSync.native).not.toHaveBeenCalled();
    expect(diagnosticFs.readdirSync(directory)).toEqual([]);
  });

  it('attributes the exact spawn, map registration and discovered child without adding process scans', async () => {
    ext.designTimeInstances.set(project, {});
    const workdir = path.join(project, 'workflow-designtime');
    const command = path.join(directory, 'private-func');
    expect(startDesignTimeProcess(undefined, workdir, command, 'host', 'start', '--token=secret')).toBeUndefined();
    expect(cp.spawn).toHaveBeenCalledExactlyOnceWith(command, ['host', 'start', '--token=secret'], {
      cwd: workdir,
      shell: true,
      detached: true,
    });
    expect(findProcess).not.toHaveBeenCalled();
    expect(findChildProcess).not.toHaveBeenCalled();
    expect(ext.designTimeInstances.get(project)?.process?.pid).toBe(23035);
    vi.mocked(axios.get).mockResolvedValue({});
    await expect(waitForDesignTimeStartUp(context(), project, 'http://localhost:7071', true)).resolves.toBeUndefined();
    expect(findChildProcess).toHaveBeenCalledExactlyOnceWith(23035);
    expect(ext.designTimeInstances.get(project)?.childFuncPid).toBe('23080');

    const records = receipts();
    const spawn = records.filter((r) => r.operation === 'design-time-spawn');
    expect(spawn.map((r) => r.status)).toEqual(['start', 'end']);
    expect(spawn[0].state).toMatchObject({
      hostPid: process.pid,
      mapCount: 1,
      startupPromisePresent: false,
      project: { sha256: digest(project) },
      workingDirectory: { sha256: digest(workdir) },
      command: { sha256: digest(command) },
      argvCount: 3,
      shell: true,
    });
    expect(spawn[1]).toMatchObject({ operationId: spawn[0].operationId, state: { pid: 23035 } });
    expect(new Set(records.map((r) => r.producerId)).size).toBe(1);
    expect(records.find((r) => r.operation === 'design-time-process-map-set').state).toMatchObject({ pid: 23035, skipped: false });
    expect(records.find((r) => r.operation === 'design-time-child-pid-set').state).toMatchObject({
      pid: 23035,
      childFuncPid: 23080,
      targetPid: 23080,
    });
    for (const secret of [project, workdir, command, '--token=secret']) expect(JSON.stringify(records)).not.toContain(secret);
  });

  it('records successful startup registration and settlement without changing its void result', async () => {
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('not ready')).mockResolvedValue({});
    vi.mocked(productFs.readFileSync).mockReturnValue('{}');
    await expect(startDesignTimeApi(context(), project)).resolves.toBeUndefined();
    expect(ext.designTimeInstances.get(project)?.startupPromise).toBeUndefined();
    expect(ext.designTimeInstances.get(project)?.childFuncPid).toBe('23080');
    const records = receipts();
    expect(records.find((r) => r.operation === 'design-time-map-set').state).toMatchObject({ mapCount: 1, startupPromisePresent: false });
    expect(records.find((r) => r.operation === 'design-time-start-request' && r.state.reused === false).state.startupPromisePresent).toBe(
      true
    );
    expect(records.find((r) => r.operation === 'design-time-startup' && r.status === 'end').state).toMatchObject({
      settled: true,
      startupPromisePresent: false,
      pid: 23035,
      childFuncPid: 23080,
    });
  });

  it('receipts an unregistered spawn without repairing the missing map ownership', () => {
    expect(startDesignTimeProcess(undefined, path.join(project, 'workflow-designtime'), 'func')).toBeUndefined();
    expect(cp.spawn).toHaveBeenCalledTimes(1);
    expect(ext.designTimeInstances.has(project)).toBe(false);
    expect(receipts().find((r) => r.operation === 'design-time-process-map-set').state).toMatchObject({
      hostPid: process.pid,
      mapCount: 0,
      skipped: true,
      processPresent: false,
      project: { sha256: digest(project) },
    });
  });

  it('joins startup receipt identity to the canonical physical project without changing raw map keys', async () => {
    const physicalProject = 'D:\\owned-fixture\\project';
    project = 'd:\\owned-fixture\\project';
    vi.mocked(productFs.realpathSync.native).mockImplementation((value) => (String(value) === project ? physicalProject : String(value)));
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('not ready')).mockResolvedValue({});
    vi.mocked(productFs.readFileSync).mockReturnValue('{}');
    await expect(startDesignTimeApi(context(), project)).resolves.toBeUndefined();
    expect(ext.designTimeInstances.has(project)).toBe(true);
    expect(ext.designTimeInstances.has(physicalProject)).toBe(false);
    const startup = receipts().find((record) => record.operation === 'design-time-startup' && record.status === 'end');
    expect(startup.state.project).toMatchObject({ sha256: digest(physicalProject) });
    expect(startup.state.project.sha256).not.toBe(digest(project));
    expect(startup.state).toMatchObject({ settled: true, processPresent: true, startupPromisePresent: false, pid: 23035 });
  });

  it('preserves concurrent startup rejection identity and records reuse and failed settlement', async () => {
    let reject!: (error: unknown) => void;
    workspace.fs.createDirectory = vi.fn(
      () =>
        new Promise((_resolve, fail) => {
          reject = fail;
        })
    ) as any;
    const first = startDesignTimeApi(context(), project);
    const second = startDesignTimeApi(context(), project);
    // Let the existing port/readiness awaits reach ensureProjectFiles.
    await vi.waitFor(() => expect(reject).toBeTypeOf('function'));
    const primary = new Error('private-startup-token');
    reject(primary);
    await expect(first).rejects.toBe(primary);
    await expect(second).rejects.toBe(primary);
    expect(reserveFreePort).toHaveBeenCalledTimes(1);
    expect(cp.spawn).not.toHaveBeenCalled();
    expect(ext.designTimeInstances.get(project)?.startupPromise).toBeUndefined();
    const records = receipts();
    expect(records.find((r) => r.operation === 'design-time-start-request' && r.state.reused).state.startupPromisePresent).toBe(true);
    expect(records.find((r) => r.operation === 'design-time-startup' && r.status === 'failure').state).toMatchObject({
      settled: true,
      startupPromisePresent: false,
    });
    expect(JSON.stringify(records)).not.toContain(primary.message);
  });

  it('retains macOS child/wrapper deduplication, deletion and stopAll settled results', async () => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    ext.designTimeInstances.set(project, { process: { pid: 111 } as any, childFuncPid: '111' });
    ext.designTimeInstances.set(`${project}-second`, { process: { pid: 222 } as any, childFuncPid: '333' });
    ext.designTimeInstances.set(`${project}-empty`, {});
    await expect(stopAllDesignTimeApis()).resolves.toBeUndefined();
    expect(vi.mocked(cp.spawn).mock.calls).toEqual([
      ['kill', ['-9', '111']],
      ['kill', ['-9', '333']],
      ['kill', ['-9', '222']],
    ]);
    expect(ext.designTimeInstances.size).toBe(0);
    const records = receipts();
    expect(records.filter((r) => r.operation === 'design-time-kill' && r.status === 'start').map((r) => r.state.targetPid)).toEqual([
      111, 333, 222,
    ]);
    expect(records.filter((r) => r.operation === 'design-time-kill' && r.status === 'end').every((r) => r.state.settled === false)).toBe(
      true
    );
    expect(records.filter((r) => r.operation === 'design-time-map-delete').map((r) => r.state.mapCount)).toEqual([2, 1, 0]);
    expect(records.find((r) => r.operation === 'design-time-stop-all' && r.status === 'start').state.mapCount).toBe(3);
    expect(records.find((r) => r.operation === 'design-time-stop-all' && r.status === 'end').state).toMatchObject({
      mapCount: 0,
      fulfilledCount: 3,
      rejectedCount: 0,
    });
    await expect(stopDesignTimeApi(project)).resolves.toBeUndefined();
    expect(receipts().at(-1).state).toMatchObject({ skipped: true, mapCount: 0 });
  });

  it('records Windows request, returned process and callback failures while preserving allSettled wait semantics', async () => {
    vi.mocked(os.platform).mockReturnValue('win32');
    const callbacks: Array<(error: Error | null) => void> = [];
    vi.spyOn(cp, 'exec').mockImplementation(((_command: string, callback: (error: Error | null) => void) => {
      callbacks.push(callback);
      return { pid: 999 } as cp.ChildProcess;
    }) as any);
    ext.designTimeInstances.set(project, { process: { pid: 111 } as any, childFuncPid: '222' });
    let resolved = false;
    const stopping = stopDesignTimeApi(project).then(() => {
      resolved = true;
    });
    await Promise.resolve();
    expect(resolved).toBe(false);
    expect(vi.mocked(cp.exec).mock.calls.map(([command]) => command)).toEqual(['taskkill /pid 222 /t /f', 'taskkill /pid 111 /t /f']);
    const primary = new Error('taskkill-private-token');
    callbacks[0](primary);
    await Promise.resolve();
    expect(resolved).toBe(false);
    callbacks[1](null);
    await stopping;
    expect(resolved).toBe(true);
    const records = receipts().filter((r) => r.operation === 'design-time-taskkill');
    expect(records.filter((r) => r.status === 'start').map((r) => r.state.targetPid)).toEqual([222, 111]);
    expect(records.filter((r) => r.status === 'sample').every((r) => r.state.pid === 999 && !r.state.settled)).toBe(true);
    expect(records.find((r) => r.status === 'failure').state).toMatchObject({ targetPid: 222, settled: true });
    expect(records.find((r) => r.status === 'end').state).toMatchObject({ targetPid: 111, settled: true });
    expect(JSON.stringify(records)).not.toContain(primary.message);
  });

  it('receipts the Windows undefined-pid skip without issuing a taskkill', async () => {
    vi.mocked(os.platform).mockReturnValue('win32');
    const taskkill = vi.spyOn(cp, 'exec').mockReturnValue({} as cp.ChildProcess);
    ext.designTimeInstances.set(project, { process: {} as cp.ChildProcess });
    await expect(stopDesignTimeApi(project)).resolves.toBeUndefined();
    expect(taskkill).not.toHaveBeenCalled();
    expect(
      receipts()
        .filter((r) => r.operation === 'design-time-taskkill')
        .map((r) => [r.status, r.state.skipped])
    ).toEqual([
      ['start', true],
      ['end', true],
    ]);
  });

  it.each(['linux', 'win32'] as const)('cleans up startup failure with platform-specific semantics on %s', async (platform) => {
    vi.mocked(os.platform).mockReturnValue(platform);
    vi.mocked(axios.get).mockRejectedValueOnce(new Error('not ready')).mockResolvedValue({});
    const primary = new Error('original post-spawn startup failure');
    vi.mocked(productFs.readFileSync).mockImplementation(() => {
      throw primary;
    });
    vi.spyOn(cp, 'exec').mockReturnValue({ pid: 444 } as cp.ChildProcess);
    await expect(startDesignTimeApi(context(), project)).rejects.toBe(primary);
    const instance = ext.designTimeInstances.get(project);
    expect(instance?.process).toBeUndefined();
    expect(instance?.childFuncPid).toBeUndefined();
    expect(instance?.startupPromise).toBeUndefined();
    if (platform === 'win32') {
      expect(vi.mocked(cp.exec).mock.calls).toEqual([['taskkill /pid 23080 /t /f'], ['taskkill /pid 23035 /t /f']]);
    } else {
      expect(cp.spawn).toHaveBeenCalledTimes(1);
      expect(process.kill).toHaveBeenCalledExactlyOnceWith(-23035, 'SIGKILL');
    }
    const records = receipts();
    const cleanup = records.filter((r) => r.operation === (platform === 'win32' ? 'design-time-taskkill' : 'design-time-kill'));
    expect(cleanup.filter((r) => r.status === 'end').map((r) => r.state.settled)).toEqual(platform === 'win32' ? [false, false] : [true]);
    if (platform === 'linux') {
      expect(cleanup.filter((r) => r.status === 'end').map((r) => r.state.targetPid)).toEqual([-23035]);
    }
    expect(records.find((r) => r.operation === 'design-time-tracked-stop').state).toMatchObject({ pid: 23035, childFuncPid: 23080 });
    expect(records.find((r) => r.operation === 'design-time-startup' && r.status === 'failure')).toBeDefined();
  });

  it('preserves exact thrown spawn/kill values and stopAll rejection accounting', async () => {
    vi.mocked(os.platform).mockReturnValue('darwin');
    const primary = { token: 'private-original-error' };
    vi.mocked(cp.spawn).mockImplementation(() => {
      throw primary;
    });
    let thrown: unknown;
    try {
      startDesignTimeProcess(undefined, path.join(project, 'workflow-designtime'), 'func');
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBe(primary);
    ext.designTimeInstances.set(project, { process: { pid: 111 } as any });
    await expect(stopDesignTimeApi(project)).rejects.toBe(primary);
    ext.designTimeInstances.set(project, { process: { pid: 111 } as any });
    await expect(stopAllDesignTimeApis()).resolves.toBeUndefined();
    expect(receipts().find((r) => r.operation === 'design-time-stop-all' && r.status === 'end').state).toMatchObject({
      fulfilledCount: 0,
      rejectedCount: 1,
    });
  });

  it('keeps state and sink failures secondary to the owning result and original error', async () => {
    const state = () => {
      throw new Error('secondary snapshot failure');
    };
    expect(() => emitDesignTimeDiagnostic('design-time-stop', state)).not.toThrow();
    expect(startDesignTimeDiagnostic('design-time-spawn', state)).toBeUndefined();
    const span = startDesignTimeDiagnostic('design-time-spawn', () => ({}));
    expect(() => finishDesignTimeDiagnostic(span, state, { error: undefined })).not.toThrow();
    diagnosticFs.rmSync(file);
    diagnosticFs.mkdirSync(file);
    ext.designTimeInstances.set(project, {});
    expect(startDesignTimeProcess(undefined, path.join(project, 'workflow-designtime'), 'func')).toBeUndefined();
    expect(ext.designTimeInstances.get(project)?.process?.pid).toBe(23035);
    await expect(stopDesignTimeApi(project)).resolves.toBeUndefined();
    expect(process.kill).toHaveBeenCalledExactlyOnceWith(-23035, 'SIGKILL');
    const primary = new Error('original spawn failure');
    vi.mocked(cp.spawn).mockImplementation(() => {
      throw primary;
    });
    expect(() => startDesignTimeProcess(undefined, undefined, 'func')).toThrow(primary);
    ext.designTimeInstances.clear();
    await expect(stopAllDesignTimeApis()).resolves.toBeUndefined();
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

  it('suppresses repeated failing health-check output while preserving other host output', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', 'host', 'start');

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
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', 'host', 'start');

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
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', 'host', 'start');

    stderr.emit('data', "Executed 'Functions.HealthCheck' (Failed, Id=11111111-1111-1111-1111-111111111111, Duration=12ms)\n");
    stderr.emit('data', "Executed 'Functions.HealthCheck' (Failed, Id=22222222-2222-2222-2222-222222222222, Duration=48ms)\n");

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain("Executed 'Functions.HealthCheck' (Failed, Id=11111111-1111-1111-1111-111111111111, Duration=12ms)\n");
    expect(appendedOutput).toContain('[Azure Logic Apps] Repeated failing health-check output suppressed.\n');
    expect(appendedOutput).not.toContain('22222222-2222-2222-2222-222222222222');
  });

  it('suppresses repeated process unhealthy logs with health-check entries', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', 'host', 'start');

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
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', 'host', 'start');

    stderr.emit('data', 'A real startup error without newline');
    stderr.emit('close');

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain('A real startup error without newline');
  });

  it('keeps stdout and stderr partial-line buffers independent', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', 'host', 'start');

    stdout.emit('data', 'Health ');
    stderr.emit('data', 'A real startup error\n');
    stdout.emit('data', 'check failed: service is unhealthy\n');

    const appendedOutput = outputChannel.append.mock.calls.map(([value]) => value).join('');

    expect(appendedOutput).toContain('A real startup error\n');
    expect(appendedOutput).toContain('Health check failed: service is unhealthy\n');
    expect(appendedOutput).not.toContain('Health A real startup error');
  });

  it('does not suppress unrelated output or existing restart-trigger diagnostics', () => {
    startDesignTimeProcess(outputChannel as any, 'D:/workspace/app-one/workflow-designtime', 'func', 'host', 'start');

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
