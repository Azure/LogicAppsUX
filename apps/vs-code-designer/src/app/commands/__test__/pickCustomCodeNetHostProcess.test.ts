import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as vscode from 'vscode';
import { pickCustomCodeNetHostProcess } from '../pickCustomCodeNetHostProcess';
import * as validatePreDebug from '../../debug/validatePreDebug';
import * as customCodeUtils from '../../utils/customCodeUtils';
import { IRunningFuncTask, runningFuncTaskMap } from '../../utils/funcCoreTools/funcHostTask';
import * as pickFuncProcessModule from '../pickFuncProcess';
import { TargetFramework } from '@microsoft/vscode-extension-logic-apps';

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
  const testLogicAppPath = `/path/to/${testLogicAppName}`;
  const testFunctionAppPath = `/path/to/${testFunctionAppName}`;
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
  const testActionContext = {} as any;
  const testFunctionsProjectMetadata = {
    projectPath: `/path/to/${testFunctionAppName}`,
    functionAppName: testFunctionAppName,
    logicAppName: testLogicAppName,
    targetFramework: TargetFramework.Net8,
    namespace: 'TestNamespace',
  };
  const testFuncTask: IRunningFuncTask = {
    startTime: Date.now(),
    processId: Number(testFuncPid),
  };

  beforeEach(() => {
    (vscode.workspace as any).workspaceFolders = [testLogicAppWorkspaceFolder, testFunctionAppWorkspaceFolder];

    vi.spyOn(validatePreDebug, 'getMatchingWorkspace').mockReturnValue(testLogicAppWorkspaceFolder);
    vi.spyOn(customCodeUtils, 'getCustomCodeFunctionsProjectMetadata').mockResolvedValue(testFunctionsProjectMetadata);
    vi.spyOn(pickFuncProcessModule, 'pickChildProcess').mockResolvedValue(testFuncPid);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    runningFuncTaskMap.clear();
  });

  it('should return undefined when no child dotnet process exists on the logic app functions host', async () => {
    runningFuncTaskMap.set(testLogicAppWorkspaceFolder, testFuncTask);
    const result = await pickCustomCodeNetHostProcess(testActionContext, testDebugConfig);
    expect(result).toBeUndefined();
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
  });

  it('should throw an error when no running task is found', async () => {
    await expect(pickCustomCodeNetHostProcess(testActionContext, testDebugConfig)).rejects.toThrowError(
      `Failed to find a running func task for the logic app "${testLogicAppName}" corresponding to the functions project "${testFunctionAppName}".`
    );
  });
});
