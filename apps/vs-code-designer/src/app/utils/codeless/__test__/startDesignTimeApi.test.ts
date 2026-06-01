import { beforeEach, describe, expect, it, vi } from 'vitest';
import { window, workspace } from 'vscode';
import axios from 'axios';
import * as cp from 'child_process';
import findProcess from 'find-process';
import * as os from 'os';
import * as portfinder from 'portfinder';
import { ext } from '../../../../extensionVariables';
import * as workspaceUtils from '../../workspace';
import { startAllDesignTimeApis, startDesignTimeApi, stopDesignTimeApi } from '../startDesignTimeApi';

vi.mock('../../appSettings/localSettings', () => ({
  addOrUpdateLocalAppSettings: vi.fn(),
  getLocalSettingsSchema: vi.fn(() => ({ Values: {} })),
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
}));

vi.mock('../../../commands/pickFuncProcess', () => ({
  findChildProcess: vi.fn(),
}));

vi.mock('../../findChildProcess/findChildProcess', () => ({
  getChildProcessesWithScript: vi.fn(),
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
  getWorkspaceLogicAppFolders: vi.fn(),
}));

vi.mock('portfinder', () => ({
  getPortPromise: vi.fn(),
}));

describe('startAllDesignTimeApis', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ext.designTimeInstances.clear();
    (workspace as any).workspaceFolders = [];
    workspace.fs.createDirectory = vi.fn().mockRejectedValue(new Error('skip startup after logging')) as any;
    vi.mocked(window.showErrorMessage).mockResolvedValue(undefined as any);
    vi.mocked(axios.get).mockRejectedValue(new Error('API not ready'));
    vi.mocked(portfinder.getPortPromise).mockResolvedValue(7071 as never);
  });

  it('logs and exits when no workspace folders are available', async () => {
    await startAllDesignTimeApis();

    expect(workspaceUtils.getWorkspaceLogicAppFolders).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('No workspace folders found. Skipping design-time startup.');
  });

  it('logs zero-project startup when the workspace contains no Logic App folders', async () => {
    (workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:/workspace' } }];
    vi.mocked(workspaceUtils.getWorkspaceLogicAppFolders).mockResolvedValue([]);

    await startAllDesignTimeApis();

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Starting design-time APIs for 0 Logic App project(s) in the current workspace.'
    );
    expect(portfinder.getPortPromise).not.toHaveBeenCalled();
  });

  it('starts each Logic App project discovered in the workspace', async () => {
    (workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:/workspace' } }];
    vi.mocked(workspaceUtils.getWorkspaceLogicAppFolders).mockResolvedValue(['D:/workspace/app-one', 'D:/workspace/app-two']);

    await startAllDesignTimeApis();

    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith(
      'Starting design-time APIs for 2 Logic App project(s) in the current workspace.'
    );
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Starting Design Time Api for project: D:/workspace/app-one');
    expect(ext.outputChannel.appendLog).toHaveBeenCalledWith('Starting Design Time Api for project: D:/workspace/app-two');
    expect(portfinder.getPortPromise).toHaveBeenCalledTimes(2);
  });

  it('rejects when Logic App folder discovery fails', async () => {
    (workspace as any).workspaceFolders = [{ uri: { fsPath: 'D:/workspace' } }];
    vi.mocked(workspaceUtils.getWorkspaceLogicAppFolders).mockRejectedValue(new Error('folder discovery failed'));

    await expect(startAllDesignTimeApis()).rejects.toThrow('folder discovery failed');
  });

  it('cleans up startup state after a startup failure', async () => {
    await startDesignTimeApi('D:/workspace/app-one');

    const designTimeInstance = ext.designTimeInstances.get('D:/workspace/app-one');

    expect(designTimeInstance).toEqual(
      expect.objectContaining({
        isStarting: false,
        startupError: expect.stringContaining('skip startup after logging'),
      })
    );
    expect(designTimeInstance?.startupPromise).toBeUndefined();
  });

  it('reuses the in-flight startup promise for concurrent calls on the same project', async () => {
    let rejectCreateDirectory: ((error: Error) => void) | undefined;
    const createDirectoryPromise = new Promise<void>((_resolve, reject) => {
      rejectCreateDirectory = reject;
    });
    workspace.fs.createDirectory = vi.fn().mockReturnValue(createDirectoryPromise) as any;

    const firstStart = startDesignTimeApi('D:/workspace/app-one');
    const secondStart = startDesignTimeApi('D:/workspace/app-one');

    expect(portfinder.getPortPromise).toHaveBeenCalledTimes(1);

    rejectCreateDirectory?.(new Error('startup still failed'));
    await Promise.all([firstStart, secondStart]);

    const designTimeInstance = ext.designTimeInstances.get('D:/workspace/app-one');
    expect(designTimeInstance?.startupPromise).toBeUndefined();
    expect(designTimeInstance?.startupError).toContain('startup still failed');
  });

  it('does not restart a running linux design-time host when the tracked child func process is valid', async () => {
    vi.mocked(os.platform).mockReturnValue('linux' as any);
    ext.designTimeInstances.set('D:/workspace/app-one', { port: 7071, process: { pid: 111 } as any, childFuncPid: '222' });
    vi.mocked(axios.get).mockResolvedValueOnce({} as any);
    vi.mocked(findProcess).mockImplementation(async (_query, pid) => (Number(pid) === 222 ? [{ name: 'func' }] : [{ name: 'sh' }]) as any);

    await startDesignTimeApi('D:/workspace/app-one');

    expect(portfinder.getPortPromise).not.toHaveBeenCalled();
    expect(ext.outputChannel.appendLog).not.toHaveBeenCalledWith(
      'Invalid func child process PID set for project at "D:/workspace/app-one". Restarting workflow design-time API.'
    );
  });

  it('kills both the tracked child and wrapper shell on linux when stopping design time', async () => {
    vi.mocked(os.platform).mockReturnValue('linux' as any);
    vi.mocked(cp.spawn).mockReturnValue({} as any);
    ext.designTimeInstances.set('D:/workspace/app-one', { process: { pid: 111 } as any, childFuncPid: '222' });

    stopDesignTimeApi('D:/workspace/app-one');

    expect(cp.spawn).toHaveBeenCalledWith('kill', ['-9', '222']);
    expect(cp.spawn).toHaveBeenCalledWith('kill', ['-9', '111']);
  });
});
