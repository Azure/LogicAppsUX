/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as path from 'node:path';
import { randomUUID } from 'node:crypto';
const fs = await vi.importActual<typeof import('node:fs')>('node:fs');
const os = await vi.importActual<typeof import('node:os')>('node:os');
import * as vscode from 'vscode';
import { ext } from '../../../../extensionVariables';

const { registerEventMock } = vi.hoisted(() => ({
  registerEventMock: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  registerEvent: registerEventMock,
}));

import { isFuncHostTask, registerFuncHostTaskEvents, runningFuncTaskMap } from '../funcHostTask';
import { emitFuncDiagnostic, finishFuncDiagnostic, startFuncDiagnostic } from '../funcTaskDiagnostics';

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
  let diagnosticRoot: string | undefined;
  let diagnosticFile: string;
  function admitDiagnostics(): void {
    diagnosticRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'la-task-events-'));
    const invocation = randomUUID();
    vi.stubEnv('VSCODE_RUNNING_TESTS', '1');
    vi.stubEnv('LA_E2E_CLI_WORKSPACE_LIFECYCLE_MODE', 'msn-weather-run');
    vi.stubEnv('LA_E2E_CLI_MSN_DIAGNOSTICS_DIR', diagnosticRoot);
    vi.stubEnv('LA_E2E_LIFECYCLE_DIR', diagnosticRoot);
    vi.stubEnv('LA_E2E_LIFECYCLE_INVOCATION', invocation);
    diagnosticFile = path.join(diagnosticRoot, `${invocation}.func-events.jsonl`);
    (vscode.workspace as any).workspaceFolders = [workspaceFolder];
  }
  const receipts = () =>
    fs
      .readFileSync(diagnosticFile, 'utf8')
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line));
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
    vi.unstubAllEnvs();
    if (diagnosticRoot) fs.rmSync(diagnosticRoot, { recursive: true, force: true });
    diagnosticRoot = undefined;
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
    it('does not even inspect diagnostic state outside admitted mode', () => {
      vi.stubEnv('VSCODE_RUNNING_TESTS', '0');
      const state = vi.fn(() => {
        throw new Error('must not inspect');
      });
      emitFuncDiagnostic('events', 'func-events-register', state);
      const span = startFuncDiagnostic('func-wait-map', state);
      finishFuncDiagnostic(span, 'failure', state, undefined);
      expect(span).toBeUndefined();
      expect(state).not.toHaveBeenCalled();
    });

    it.each([
      ['${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}', true, false],
      ['C:\\private\\func.exe', false, true],
      ['/private/tools/func', false, true],
      ['npm', false, false],
    ])('receipts preserve actual synthetic shell classification without changing it: %s', async (command, classified, physical) => {
      admitDiagnostics();
      registerFuncHostTaskEvents();
      const start = registerEventMock.mock.calls[0][2];
      const end = registerEventMock.mock.calls[1][2];
      const task = createShellTask(command, workspaceFolder);
      task.definition.command = '${config:azureLogicAppsStandard.funcCoreToolsBinaryPath}';
      const execution = { task };
      await start({ errorHandling: {}, telemetry: {} }, { execution, processId: 123 });
      expect(runningFuncTaskMap.has(workspaceFolder)).toBe(classified);
      if (classified) runningFuncTaskMap.get(workspaceFolder)!.childProcessId = ['456', '789'];
      await end({ errorHandling: {}, telemetry: {} }, { execution, exitCode: 0 });
      expect(runningFuncTaskMap.size).toBe(0);
      expect(ext.workflowRuntimePort).toBe(classified ? undefined : '7071');
      const records = receipts();
      const started = records.find((r) => r.operation === 'func-task-start-event').state;
      const ended = records.find((r) => r.operation === 'func-task-end-event').state;
      expect(started).toMatchObject({
        classified,
        commandPhysical: physical,
        commandPlaceholder: classified,
        definitionCommandPlaceholder: true,
        commandStructured: false,
        scopePresent: true,
        scopeExact: true,
        scopeMatches: true,
        mapCount: 0,
        childCount: 0,
        pid: 123,
      });
      expect(ended.taskId).toBe(started.taskId);
      expect(ended.executionId).toBe(started.executionId);
      if (classified) {
        expect(ended).toMatchObject({ trackedPid: 123, childCount: 2, mapCount: 1 });
        expect(records.find((r) => r.operation === 'func-map-set').state).toMatchObject({ trackedPid: 123, mapCount: 1 });
        expect(records.find((r) => r.operation === 'func-map-delete').state).toMatchObject({ childCount: 0, mapCount: 0 });
      } else {
        expect(records.some((r) => ['func-map-set', 'func-map-delete'].includes(r.operation))).toBe(false);
      }
      if (physical) expect(JSON.stringify(records)).not.toContain(command);
    });

    it('records scope absence and exact-key deletion without repairing cloned-scope map behavior', async () => {
      admitDiagnostics();
      registerFuncHostTaskEvents();
      const start = registerEventMock.mock.calls[0][2];
      const end = registerEventMock.mock.calls[1][2];
      await start({ errorHandling: {}, telemetry: {} }, { execution: { task: createProcessTask('func start') }, processId: 123 });
      expect(runningFuncTaskMap.size).toBe(0);
      const clone = { ...workspaceFolder };
      runningFuncTaskMap.set(workspaceFolder, { startTime: 0, processId: 321, childProcessId: ['9'] });
      await end({ errorHandling: {}, telemetry: {} }, { execution: { task: createProcessTask('func start', clone) }, exitCode: 0 });
      expect(runningFuncTaskMap.has(workspaceFolder)).toBe(true);
      const records = receipts();
      expect(records.find((r) => r.operation === 'func-task-start-event').state).toMatchObject({
        scopePresent: false,
        classified: false,
        scopeMatches: false,
      });
      expect(records.find((r) => r.operation === 'func-map-delete').state).toMatchObject({
        scopePresent: true,
        scopeExact: false,
        scopeMatches: true,
        mapCount: 1,
      });
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
