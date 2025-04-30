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

describe('pickCustomCodeNetHostProcess', () => {
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
    vi.spyOn(validatePreDebug, 'getMatchingWorkspaceFolder').mockReturnValue(undefined);
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
