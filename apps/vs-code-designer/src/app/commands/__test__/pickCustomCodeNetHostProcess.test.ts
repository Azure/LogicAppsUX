import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { pickCustomCodeNetHostProcess, pickCustomCodeNetHostProcessInternal } from '../pickCustomCodeNetHostProcess';
import * as validatePreDebug from '../../debug/validatePreDebug';
import { IRunningFuncTask, runningFuncTaskMap } from '../../utils/funcCoreTools/funcHostTask';
import * as pickFuncProcessModule from '../pickFuncProcess';
import * as verifyIsProject from '../../utils/verifyIsProject';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';

vi.mock('vscode', () => ({
  Uri: {
    file: (path: string) => ({ path, fsPath: path }),
  },
  workspace: {
    workspaceFolders: [],
    getWorkspaceFolder: vi.fn(),
  },
}));

describe('pickCustomCodeNetHostProcess', async () => {
  const testLogicAppName = 'LogicApp';
  const testFunctionAppName = 'FunctionApp';
  const testLogicAppPath = path.join('path', 'to', testLogicAppName);
  const testFunctionAppPath = path.join('path', 'to', testFunctionAppName);
  const testFuncPid = '12345';
  const testDotnetPid = '67890';

  const testLogicAppWorkspaceFolder: vscode.WorkspaceFolder = {
    uri: vscode.Uri.file(testLogicAppPath),
    name: testLogicAppName,
    index: 0,
  };
  const testFunctionAppWorkspaceFolder: vscode.WorkspaceFolder = {
    uri: vscode.Uri.file(testFunctionAppPath),
    name: testFunctionAppName,
    index: 1,
  };
  const testDebugConfig: vscode.DebugConfiguration = { type: 'dummy', name: 'dummy', request: 'launch' };
  const testActionContext = {
    telemetry: { properties: {} },
  } as IActionContext;
  const testFuncTask: IRunningFuncTask = {
    startTime: Date.now(),
    processId: Number(testFuncPid),
  };

  beforeEach(() => {
    (vscode.workspace as any).workspaceFolders = [testLogicAppWorkspaceFolder, testFunctionAppWorkspaceFolder];

    vi.spyOn(validatePreDebug, 'getMatchingWorkspaceFolder').mockReturnValue(testLogicAppWorkspaceFolder);
    vi.spyOn(pickFuncProcessModule, 'pickChildProcess').mockResolvedValue(testFuncPid);
    vi.spyOn(verifyIsProject, 'tryGetLogicAppProjectRoot').mockResolvedValue(testLogicAppPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    runningFuncTaskMap.clear();
  });

  it('should return a child process id when a func task for the logic app is running and child dotnet process exists', async () => {
    runningFuncTaskMap.set(testLogicAppWorkspaceFolder, testFuncTask);
    vi.spyOn(pickFuncProcessModule, 'getWindowsChildren').mockImplementation((pid: Number) => {
      if (pid === Number(testFuncPid)) {
        return Promise.resolve([{ command: 'dotnet.exe', pid: testDotnetPid }]);
      }
      return Promise.resolve([]);
    });
    vi.spyOn(pickFuncProcessModule, 'getUnixChildren').mockImplementation((pid: Number) => {
      if (pid === Number(testFuncPid)) {
        return Promise.resolve([{ command: 'dotnet', pid: testDotnetPid }]);
      }
      return Promise.resolve([]);
    });
    const result = await pickCustomCodeNetHostProcess(testActionContext, testDebugConfig);
    expect(result).toBe(testDotnetPid);
    expect(testActionContext.telemetry.properties.result).toBe('Succeeded');
    expect(testActionContext.telemetry.properties.lastStep).toBe('pickNetHostChildProcess');
  });

  it('should throw an error when no workspace folder matching the debug configuration is found', async () => {
    vi.spyOn(validatePreDebug, 'getMatchingWorkspaceFolder').mockReturnValue(undefined as any);
    await expect(pickCustomCodeNetHostProcess(testActionContext, testDebugConfig)).rejects.toThrow();
    expect(testActionContext.telemetry.properties.result).toBe('Failed');
    expect(testActionContext.telemetry.properties.lastStep).toBe('getMatchingWorkspaceFolder');
  });

  it('should throw an error when no logic app folder project is found in the workspace folder', async () => {
    vi.spyOn(verifyIsProject, 'tryGetLogicAppProjectRoot').mockResolvedValue(undefined);
    await expect(pickCustomCodeNetHostProcess(testActionContext, testDebugConfig)).rejects.toThrow();
    expect(testActionContext.telemetry.properties.result).toBe('Failed');
    expect(testActionContext.telemetry.properties.lastStep).toBe('tryGetLogicAppProjectRoot');
  });
});

describe('pickCustomCodeNetHostProcessInternal', () => {
  const testLogicAppName = 'LogicApp';
  const testLogicAppPath = path.join('path', 'to', testLogicAppName);
  const testFuncPid = '12345';

  const testLogicAppWorkspaceFolder: vscode.WorkspaceFolder = {
    uri: vscode.Uri.file(testLogicAppPath),
    name: testLogicAppName,
    index: 0,
  };
  const testActionContext = {
    telemetry: { properties: {} },
  } as IActionContext;
  const testFuncTask: IRunningFuncTask = {
    startTime: Date.now(),
    processId: Number(testFuncPid),
  };

  beforeEach(() => {
    (vscode.workspace as any).workspaceFolders = [testLogicAppWorkspaceFolder];

    vi.spyOn(validatePreDebug, 'getMatchingWorkspaceFolder').mockReturnValue(testLogicAppWorkspaceFolder);
    vi.spyOn(pickFuncProcessModule, 'pickChildProcess').mockResolvedValue(testFuncPid);
    vi.spyOn(verifyIsProject, 'tryGetLogicAppProjectRoot').mockResolvedValue(testLogicAppPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    runningFuncTaskMap.clear();
  });

  it('should throw an error when no child dotnet process exists on the logic app functions host', async () => {
    runningFuncTaskMap.set(testLogicAppWorkspaceFolder, testFuncTask);
    await expect(pickCustomCodeNetHostProcessInternal(testActionContext, testLogicAppWorkspaceFolder, testLogicAppPath)).rejects.toThrow();
    expect(testActionContext.telemetry.properties.result).toBe('Failed');
    expect(testActionContext.telemetry.properties.lastStep).toBe('pickNetHostChildProcess');
  });

  it('should throw an error when no running task is found', async () => {
    await expect(pickCustomCodeNetHostProcessInternal(testActionContext, testLogicAppWorkspaceFolder, testLogicAppPath)).rejects.toThrow(
      `Failed to find a running func task for the logic app "${testLogicAppName}". The logic app must be running to attach the function debugger.`
    );
    expect(testActionContext.telemetry.properties.result).toBe('Failed');
    expect(testActionContext.telemetry.properties.lastStep).toBe('getRunningFuncTask');
  });
});

describe('pickNetHostChildProcess', async () => {
  const testFuncPid = 12345;
  const testDotnetPid = 67890;
  const testLogicAppName = 'LogicApp';
  const testLogicAppPath = path.join('path', 'to', testLogicAppName);

  const testLogicAppWorkspaceFolder: vscode.WorkspaceFolder = {
    uri: vscode.Uri.file(testLogicAppPath),
    name: testLogicAppName,
    index: 0,
  };
  const testActionContext = {
    telemetry: { properties: {} },
  } as IActionContext;
  const testFuncTask: IRunningFuncTask = {
    startTime: Date.now(),
    processId: Number(testFuncPid),
  };

  beforeEach(() => {
    (vscode.workspace as any).workspaceFolders = [testLogicAppWorkspaceFolder];

    vi.spyOn(validatePreDebug, 'getMatchingWorkspaceFolder').mockReturnValue(testLogicAppWorkspaceFolder);
    vi.spyOn(pickFuncProcessModule, 'pickChildProcess').mockResolvedValue(testFuncPid.toString());
    vi.spyOn(verifyIsProject, 'tryGetLogicAppProjectRoot').mockResolvedValue(testLogicAppPath);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the pid of a child process matching dotnet.exe on Windows', async () => {
    vi.stubGlobal('process', { platform: 'win32' });
    vi.spyOn(pickFuncProcessModule, 'getWindowsChildren').mockResolvedValue([
      { command: 'other.exe', pid: 11111 },
      { command: 'dotnet.exe', pid: testDotnetPid },
    ]);

    // Re-import to get the mocked version
    const { pickNetHostChildProcess: pickNetHostChildProcessMocked } = await import('../pickCustomCodeNetHostProcess');
    const result = await pickNetHostChildProcessMocked({ startTime: Date.now(), processId: testFuncPid });
    expect(result).toBe(testDotnetPid.toString());
  });

  it('should return the pid of a child process matching dotnet on Unix', async () => {
    vi.stubGlobal('process', { platform: 'linux' });
    vi.spyOn(pickFuncProcessModule, 'getUnixChildren').mockResolvedValue([
      { command: 'other', pid: 11111 },
      { command: 'dotnet', pid: testDotnetPid },
      { command: 'other2', pid: 11112 },
    ]);

    const { pickNetHostChildProcess: pickNetHostChildProcessMocked } = await import('../pickCustomCodeNetHostProcess');
    const result = await pickNetHostChildProcessMocked({ startTime: Date.now(), processId: testFuncPid });
    expect(result).toBe(testDotnetPid.toString());
  });

  it('should return the pid of a child process matching func on Unix', async () => {
    vi.stubGlobal('process', { platform: 'linux' });
    vi.spyOn(pickFuncProcessModule, 'getUnixChildren').mockResolvedValue([
      { command: 'func.exe', pid: testDotnetPid },
      { command: 'other', pid: 11111 },
    ]);

    const { pickNetHostChildProcess: pickNetHostChildProcessMocked } = await import('../pickCustomCodeNetHostProcess');
    const result = await pickNetHostChildProcessMocked({ startTime: Date.now(), processId: testFuncPid });
    expect(result).toBe(testDotnetPid.toString());
  });

  it('should return undefined if no matching child process is found', async () => {
    vi.stubGlobal('process', { platform: 'win32' });
    const { pickNetHostChildProcess: pickNetHostChildProcessMocked } = await import('../pickCustomCodeNetHostProcess');
    const result = await pickNetHostChildProcessMocked({ startTime: Date.now(), processId: testFuncPid });
    expect(result).toBeUndefined();
  });

  it('should return undefined if pickChildProcess returns undefined', async () => {
    vi.stubGlobal('process', { platform: 'win32' });
    const getWindowsChildren = vi.fn();
    const getUnixChildren = vi.fn();
    vi.spyOn(pickFuncProcessModule, 'pickChildProcess').mockResolvedValue(undefined as any);

    const { pickNetHostChildProcess: pickNetHostChildProcessMocked } = await import('../pickCustomCodeNetHostProcess');
    const result = await pickNetHostChildProcessMocked({ startTime: Date.now(), processId: testFuncPid });
    expect(result).toBeUndefined();
  });
});
