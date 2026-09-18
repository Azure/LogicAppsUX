/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../../extensionVariables';

const { registerEventMock } = vi.hoisted(() => ({
  registerEventMock: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  registerEvent: registerEventMock,
}));

import { isFuncHostTask, registerFuncHostTaskEvents, runningFuncTaskMap, stopFuncTaskForWorkspace } from '../funcHostTask';
import { projectRuntimeRegistry } from '../projectRuntimeRegistry';

function createShellTask(command: string, scope?: vscode.WorkspaceFolder | vscode.TaskScope): vscode.Task {
  return {
    definition: { type: 'shell' },
    execution: {
      command,
      commandLine: command,
    },
    scope,
  } as vscode.Task;
}

function createProcessTask(commandLine: string, scope?: vscode.WorkspaceFolder | vscode.TaskScope): vscode.Task {
  return {
    definition: { type: 'process' },
    execution: {
      commandLine,
    },
    scope,
  } as vscode.Task;
}

describe('funcHostTask', () => {
  const workspaceFolder = {
    name: 'logicapp',
    index: 0,
    uri: vscode.Uri.file('D:\\test\\logicapp'),
  } as vscode.WorkspaceFolder;

  beforeEach(() => {
    vi.clearAllMocks();
    runningFuncTaskMap.clear();
    projectRuntimeRegistry.clear();
    (ext as any).workflowRuntimePort = '7071';
    (vscode as any).tasks = {
      onDidStartTaskProcess: vi.fn(),
      onDidEndTaskProcess: vi.fn(),
    };
    (vscode as any).debug = {
      onDidTerminateDebugSession: vi.fn(),
    };
  });

  describe('isFuncHostTask', () => {
    it('returns true for shell tasks using funcCoreToolsBinaryPath config', () => {
      const task = createShellTask('${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}');

      expect(isFuncHostTask(task)).toBe(true);
    });

    it('returns true for func host start command lines', () => {
      const task = createProcessTask('func host start');

      expect(isFuncHostTask(task)).toBe(true);
    });

    it('returns true for func start command lines with custom ports', () => {
      const task = createProcessTask('func start --port 7072');

      expect(isFuncHostTask(task)).toBe(true);
    });

    it('returns false for unrelated command lines', () => {
      const task = createProcessTask('npm run start');

      expect(isFuncHostTask(task)).toBe(false);
    });
  });

  it('does not stop a different project task tracked in the same workspace', async () => {
    const trackedExecution = { task: createProcessTask('func host start', workspaceFolder), terminate: vi.fn() } as vscode.TaskExecution;
    const requestedExecution = { task: createProcessTask('func host start', workspaceFolder), terminate: vi.fn() } as vscode.TaskExecution;
    runningFuncTaskMap.set(workspaceFolder, {
      processId: 200,
      startTime: Date.now(),
      taskExecution: trackedExecution,
    });

    await expect(
      stopFuncTaskForWorkspace(workspaceFolder, {
        expectedProcessId: 100,
        expectedTaskExecution: requestedExecution,
      })
    ).resolves.toBe(false);
    expect(trackedExecution.terminate).not.toHaveBeenCalled();
    expect(requestedExecution.terminate).not.toHaveBeenCalled();
    expect(runningFuncTaskMap.get(workspaceFolder)?.processId).toBe(200);
  });

  describe('registerFuncHostTaskEvents', () => {
    it('tracks running func host tasks when they start', async () => {
      registerFuncHostTaskEvents();
      const startHandler = registerEventMock.mock.calls.find((call) => call[0] === 'azureLogicAppsStandard.onDidStartTask')?.[2];
      const task = createProcessTask('func host start', workspaceFolder);

      await startHandler(
        { errorHandling: {}, telemetry: {} },
        {
          execution: { task },
          processId: 1234,
        }
      );

      expect(runningFuncTaskMap.get(workspaceFolder)).toEqual({
        startTime: expect.any(Number),
        processId: 1234,
        taskExecution: expect.any(Object),
      });
    });

    it('clears the cached workflow runtime port when a func host task ends', async () => {
      registerFuncHostTaskEvents();
      const endHandler = registerEventMock.mock.calls.find((call) => call[0] === 'azureLogicAppsStandard.onDidEndTask')?.[2];
      const task = createProcessTask('func start --port 7072', workspaceFolder);
      runningFuncTaskMap.set(workspaceFolder, { processId: 5678, startTime: Date.now() });

      await endHandler(
        { errorHandling: {}, telemetry: {} },
        {
          execution: { task },
          exitCode: 0,
        }
      );

      expect(runningFuncTaskMap.has(workspaceFolder)).toBe(false);
      expect((ext as any).workflowRuntimePort).toBeUndefined();
    });

    it('does not clear a newer project runtime when an older task ends', async () => {
      registerFuncHostTaskEvents();
      const endHandler = registerEventMock.mock.calls.find((call) => call[0] === 'azureLogicAppsStandard.onDidEndTask')?.[2];
      const oldExecution = { task: createProcessTask('func host start', workspaceFolder) };
      const first = projectRuntimeRegistry.beginRuntimeStart(workspaceFolder.uri, workspaceFolder.uri, 7071);
      projectRuntimeRegistry.bindTaskExecution(first, oldExecution, 100);
      projectRuntimeRegistry.markRunning(first);
      const second = projectRuntimeRegistry.beginRuntimeStart(workspaceFolder.uri, workspaceFolder.uri, 7072);
      projectRuntimeRegistry.markRunning(second, 200);
      (ext as any).workflowRuntimePort = 7072;

      await endHandler(
        { errorHandling: {}, telemetry: {} },
        {
          execution: oldExecution,
          exitCode: 0,
        }
      );

      expect(projectRuntimeRegistry.getByHandle(second)).toMatchObject({ lifecycle: 'running', port: 7072 });
      expect((ext as any).workflowRuntimePort).toBe(7072);
    });

    it('does not remove a newer tracked task when an older task ends in the same workspace', async () => {
      registerFuncHostTaskEvents();
      const endHandler = registerEventMock.mock.calls.find((call) => call[0] === 'azureLogicAppsStandard.onDidEndTask')?.[2];
      const task = createProcessTask('func host start', workspaceFolder);
      const oldExecution = { task } as vscode.TaskExecution;
      const newExecution = { task } as vscode.TaskExecution;
      runningFuncTaskMap.set(workspaceFolder, {
        processId: 2222,
        startTime: Date.now(),
        taskExecution: newExecution,
      });

      await endHandler(
        { errorHandling: {}, telemetry: {} },
        {
          execution: oldExecution,
          exitCode: 0,
        }
      );

      expect(runningFuncTaskMap.get(workspaceFolder)?.processId).toBe(2222);
    });
  });
});
