/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../../extensionVariables';

const { registerEventMock } = vi.hoisted(() => ({
  registerEventMock: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  registerEvent: registerEventMock,
}));

import { isFuncHostTask, registerFuncHostTaskEvents, runningFuncTaskMap } from '../funcHostTask';

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
    (ext as any).workflowRuntimePort = '7071';
    (vscode as any).tasks = {
      onDidStartTaskProcess: vi.fn(),
      onDidEndTaskProcess: vi.fn(),
    };
    (vscode as any).debug = {
      onDidTerminateDebugSession: vi.fn(),
    };
  });
  afterEach(() => {
    runningFuncTaskMap.clear();
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

  describe('registerFuncHostTaskEvents', () => {
    it.each([
      ['${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}', true],
      ['C:\\private\\func.exe', false],
      ['/private/tools/func', false],
      ['npm', false],
    ])('tracks and clears only shell tasks classified by their execution command: %s', async (command, classified) => {
      registerFuncHostTaskEvents();
      const start = registerEventMock.mock.calls[0][2];
      const end = registerEventMock.mock.calls[1][2];
      const task = createShellTask(command, workspaceFolder);
      task.definition.command = '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}';
      const execution = { task };
      await start({ errorHandling: {}, telemetry: {} }, { execution, processId: 123 });
      expect(runningFuncTaskMap.has(workspaceFolder)).toBe(classified);
      if (classified) {
        expect(runningFuncTaskMap.get(workspaceFolder)).toEqual({ startTime: expect.any(Number), processId: 123 });
        runningFuncTaskMap.get(workspaceFolder)!.childProcessId = ['456', '789'];
      }
      await end({ errorHandling: {}, telemetry: {} }, { execution, exitCode: 0 });
      expect(runningFuncTaskMap.size).toBe(0);
      expect(ext.workflowRuntimePort).toBe(classified ? undefined : '7071');
    });

    it('ignores absent scopes and deletes only the exact event scope key', async () => {
      registerFuncHostTaskEvents();
      const start = registerEventMock.mock.calls[0][2];
      const end = registerEventMock.mock.calls[1][2];
      await start({ errorHandling: {}, telemetry: {} }, { execution: { task: createProcessTask('func start') }, processId: 123 });
      expect(runningFuncTaskMap.size).toBe(0);
      await end({ errorHandling: {}, telemetry: {} }, { execution: { task: createProcessTask('func start') }, exitCode: 0 });
      expect(ext.workflowRuntimePort).toBe('7071');
      const clone = { ...workspaceFolder };
      const originalTaskInfo = { startTime: 0, processId: 321, childProcessId: ['9'] };
      runningFuncTaskMap.set(workspaceFolder, originalTaskInfo);
      await start({ errorHandling: {}, telemetry: {} }, { execution: { task: createProcessTask('func start', clone) }, processId: 123 });
      expect(runningFuncTaskMap.get(clone)?.processId).toBe(123);
      expect(runningFuncTaskMap.get(workspaceFolder)).toBe(originalTaskInfo);
      await end({ errorHandling: {}, telemetry: {} }, { execution: { task: createProcessTask('func start', clone) }, exitCode: 0 });
      expect(runningFuncTaskMap.has(clone)).toBe(false);
      expect(runningFuncTaskMap.size).toBe(1);
      expect(runningFuncTaskMap.get(workspaceFolder)).toBe(originalTaskInfo);
      expect(ext.workflowRuntimePort).toBeUndefined();
    });

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
  });
});
