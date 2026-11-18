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

  describe('isFuncHostTask', () => {
    it.each(['shell', 'func'])('does not track unresolved %s tasks', (type) => {
      expect(isFuncHostTask({ definition: { type }, execution: undefined } as vscode.Task)).toBe(false);
    });

    it.each(['func', 'C:\\tools\\func.exe', '/tools/func', '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}'])(
      'recognizes real ProcessExecution host tasks using %s',
      (executable) => {
        const task = {
          definition: { type: 'process' },
          execution: new vscode.ProcessExecution(executable, ['host', 'start']),
          scope: workspaceFolder,
        } as vscode.Task;
        expect(isFuncHostTask(task)).toBe(true);
      }
    );

    it.each([
      ['dotnet', ['host', 'start']],
      ['func', ['extensions', 'install']],
    ])('does not track unrelated ProcessExecution %s/%j', (executable, args) => {
      expect(
        isFuncHostTask({
          definition: { type: 'process' },
          execution: new vscode.ProcessExecution(executable, args as string[]),
        } as vscode.Task)
      ).toBe(false);
    });

    it('recognizes actual ShellExecution command-line tasks', () => {
      expect(
        isFuncHostTask({
          definition: { type: 'shell' },
          execution: new vscode.ShellExecution('func host start'),
        } as vscode.Task)
      ).toBe(true);
    });

    it('recognizes the ShellExecution command/args form without requiring commandLine', () => {
      expect(
        isFuncHostTask({
          definition: { type: 'shell' },
          execution: { command: { value: 'C:\\tools\\func.exe', quoting: 1 }, args: ['host', 'start'] },
        } as vscode.Task)
      ).toBe(true);
    });

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
    it('tracks and clears a real bound ProcessExecution by its workspace', async () => {
      registerFuncHostTaskEvents();
      const startHandler = registerEventMock.mock.calls.find((call) => call[0] === 'azureLogicAppsStandard.onDidStartTask')?.[2];
      const endHandler = registerEventMock.mock.calls.find((call) => call[0] === 'azureLogicAppsStandard.onDidEndTask')?.[2];
      const task = {
        definition: { type: 'process' },
        scope: workspaceFolder,
        execution: new vscode.ProcessExecution('C:\\tools\\func.exe', ['host', 'start'], {
          env: { FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI: 'http://127.0.0.1:12345/selected' },
        }),
      } as vscode.Task;
      await startHandler({ errorHandling: {}, telemetry: {} }, { execution: { task }, processId: 1234 });
      expect(runningFuncTaskMap.get(workspaceFolder)?.processId).toBe(1234);
      await endHandler({ errorHandling: {}, telemetry: {} }, { execution: { task }, exitCode: 0 });
      expect(runningFuncTaskMap.has(workspaceFolder)).toBe(false);
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
