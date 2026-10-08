/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { ext } from '../../../../extensionVariables';
import * as cp from 'child_process';
import * as os from 'os';
import psTree from 'ps-tree';

const { registerEventMock } = vi.hoisted(() => ({
  registerEventMock: vi.fn(),
}));

vi.mock('@microsoft/vscode-azext-utils', () => ({
  registerEvent: registerEventMock,
}));

vi.mock('ps-tree', () => ({
  default: vi.fn(),
}));

import {
  executeFuncTaskForCleanup,
  isFuncHostTask,
  ownedFuncTasks,
  registerFuncHostTaskEvents,
  resetFuncTaskShutdownStateForTest,
  runningFuncTaskMap,
  stopAllFuncTasks,
  trackFuncTaskForCleanup,
} from '../funcHostTask';

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
    resetFuncTaskShutdownStateForTest();
    runningFuncTaskMap.clear();
    ownedFuncTasks.length = 0;
    (ext as any).workflowRuntimePort = '7071';
    (vscode as any).tasks = {
      executeTask: vi.fn(),
      onDidStartTaskProcess: vi.fn(),
      onDidEndTaskProcess: vi.fn(),
      taskExecutions: [],
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
        task,
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

  describe('executeFuncTaskForCleanup', () => {
    it('owns a newly launched task before the launch completes', async () => {
      let resolveTaskExecution: ((execution: vscode.TaskExecution) => void) | undefined;
      const task = createProcessTask('func host start', workspaceFolder);
      const execution = { task, terminate: vi.fn() } as unknown as vscode.TaskExecution;
      vi.mocked(vscode.tasks.executeTask).mockReturnValue(
        new Promise<vscode.TaskExecution>((resolve) => {
          resolveTaskExecution = resolve;
        })
      );

      const launchPromise = executeFuncTaskForCleanup(task);

      expect(ownedFuncTasks).toContain(task);
      resolveTaskExecution?.(execution);

      await expect(launchPromise).resolves.toBe(true);
      expect(vscode.tasks.executeTask).toHaveBeenCalledWith(task);
    });

    it('does not claim an equivalent task that is already active', async () => {
      const task = createProcessTask('func host start', workspaceFolder);
      (vscode.tasks.taskExecutions as vscode.TaskExecution[]) = [{ task }] as vscode.TaskExecution[];

      await expect(executeFuncTaskForCleanup(task)).resolves.toBe(false);

      expect(vscode.tasks.executeTask).not.toHaveBeenCalled();
      expect(ownedFuncTasks).toHaveLength(0);
    });

    it('releases ownership when task launch fails', async () => {
      const task = createProcessTask('func host start', workspaceFolder);
      vi.mocked(vscode.tasks.executeTask).mockRejectedValue(new Error('launch failed'));

      await expect(executeFuncTaskForCleanup(task)).rejects.toThrow('launch failed');

      expect(ownedFuncTasks).toHaveLength(0);
    });
  });

  describe('stopAllFuncTasks', () => {
    it('waits for an in-flight owned task launch before terminating it', async () => {
      let resolveTaskExecution: ((execution: vscode.TaskExecution) => void) | undefined;
      const task = createProcessTask('func host start', workspaceFolder);
      const execution = {
        task,
        terminate: vi.fn(() => {
          (vscode.tasks.taskExecutions as vscode.TaskExecution[]) = [];
        }),
      } as unknown as vscode.TaskExecution;
      vi.mocked(vscode.tasks.executeTask).mockReturnValue(
        new Promise<vscode.TaskExecution>((resolve) => {
          resolveTaskExecution = resolve;
        })
      );

      const launchPromise = executeFuncTaskForCleanup(task);
      let stopped = false;
      const stopPromise = stopAllFuncTasks().then(() => {
        stopped = true;
      });
      await Promise.resolve();

      expect(stopped).toBe(false);
      expect(execution.terminate).not.toHaveBeenCalled();

      (vscode.tasks.taskExecutions as vscode.TaskExecution[]) = [execution];
      resolveTaskExecution?.(execution);
      await launchPromise;
      await stopPromise;

      expect(execution.terminate).toHaveBeenCalledOnce();
      expect(stopped).toBe(true);
      expect(ownedFuncTasks).toHaveLength(0);
    });

    it('waits for an owned task without a process ID to finish terminating', async () => {
      const task = createProcessTask('func host start', workspaceFolder);
      const execution = {
        task,
        terminate: vi.fn(() => {
          setTimeout(() => {
            (vscode.tasks.taskExecutions as vscode.TaskExecution[]) = [];
          }, 50);
        }),
      } as unknown as vscode.TaskExecution;
      trackFuncTaskForCleanup(task);
      (vscode.tasks.taskExecutions as vscode.TaskExecution[]) = [execution];

      let resolved = false;
      const stopPromise = stopAllFuncTasks().then(() => {
        resolved = true;
      });
      await Promise.resolve();

      expect(execution.terminate).toHaveBeenCalledOnce();
      expect(resolved).toBe(false);

      await stopPromise;

      expect(resolved).toBe(true);
      expect(ownedFuncTasks).toHaveLength(0);
    });

    it('waits for every tracked Windows process tree and terminates active func task executions', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32' as NodeJS.Platform);
      const taskkillCallbacks: Array<() => void> = [];
      vi.spyOn(cp, 'exec').mockImplementation(((_command: string, callback?: cp.ExecException | any) => {
        taskkillCallbacks.push(() => callback?.(null, '', ''));
        return {} as cp.ChildProcess;
      }) as any);

      const secondWorkspaceFolder = {
        name: 'logicapp-two',
        index: 1,
        uri: vscode.Uri.file('D:\\test\\logicapp-two'),
      } as vscode.WorkspaceFolder;
      runningFuncTaskMap.set(workspaceFolder, { processId: 100, childProcessId: ['101'], startTime: Date.now() });
      runningFuncTaskMap.set(secondWorkspaceFolder, { processId: 200, childProcessId: ['201'], startTime: Date.now() });

      const firstTask = createProcessTask('func host start', workspaceFolder);
      const secondTask = createProcessTask('func host start', secondWorkspaceFolder);
      trackFuncTaskForCleanup(firstTask);
      trackFuncTaskForCleanup(secondTask);
      const firstExecution = {
        task: firstTask,
        terminate: vi.fn(),
      } as unknown as vscode.TaskExecution;
      const secondExecution = {
        task: secondTask,
        terminate: vi.fn(),
      } as unknown as vscode.TaskExecution;
      const unrelatedExecution = {
        task: createProcessTask('func host start', {
          name: 'unowned',
          index: 2,
          uri: vscode.Uri.file('D:\\test\\unowned'),
        } as vscode.WorkspaceFolder),
        terminate: vi.fn(),
      } as unknown as vscode.TaskExecution;
      (vscode.tasks.taskExecutions as vscode.TaskExecution[]) = [firstExecution, secondExecution, unrelatedExecution];

      let resolved = false;
      const stopPromise = stopAllFuncTasks().then(() => {
        resolved = true;
      });
      await Promise.resolve();

      expect(cp.exec).toHaveBeenCalledWith('taskkill /PID 100 /T /F', expect.any(Function));
      expect(cp.exec).toHaveBeenCalledWith('taskkill /PID 101 /T /F', expect.any(Function));
      expect(cp.exec).toHaveBeenCalledWith('taskkill /PID 200 /T /F', expect.any(Function));
      expect(cp.exec).toHaveBeenCalledWith('taskkill /PID 201 /T /F', expect.any(Function));
      expect(resolved).toBe(false);

      for (const callback of taskkillCallbacks) {
        callback();
      }
      await stopPromise;

      expect(firstExecution.terminate).toHaveBeenCalledOnce();
      expect(secondExecution.terminate).toHaveBeenCalledOnce();
      expect(unrelatedExecution.terminate).not.toHaveBeenCalled();
      expect(runningFuncTaskMap.size).toBe(0);
      expect((ext as any).workflowRuntimePort).toBeUndefined();
    });

    it('kills the tracked parent and child processes on Unix', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('linux' as NodeJS.Platform);
      vi.mocked(psTree).mockImplementation((_pid, callback) => {
        callback(null, [{ PID: '103', COMMAND: 'node' } as any]);
      });
      const closeHandlers: Array<() => void> = [];
      vi.spyOn(cp, 'spawn').mockImplementation((() => {
        const child = {
          on: vi.fn((event: string, handler: () => void) => {
            if (event === 'close') {
              closeHandlers.push(handler);
            }
            return child;
          }),
        };
        return child as unknown as cp.ChildProcess;
      }) as any);
      runningFuncTaskMap.set(workspaceFolder, { processId: 100, childProcessId: ['101', '102'], startTime: Date.now() });
      trackFuncTaskForCleanup(createProcessTask('func host start', workspaceFolder));

      const stopPromise = stopAllFuncTasks();
      await vi.waitFor(() => expect(cp.spawn).toHaveBeenCalledTimes(4));

      expect(cp.spawn).toHaveBeenCalledWith('kill', ['-9', '100']);
      expect(cp.spawn).toHaveBeenCalledWith('kill', ['-9', '101']);
      expect(cp.spawn).toHaveBeenCalledWith('kill', ['-9', '102']);
      expect(cp.spawn).toHaveBeenCalledWith('kill', ['-9', '103']);

      for (const handler of closeHandlers) {
        handler();
      }
      await stopPromise;

      expect(runningFuncTaskMap.size).toBe(0);
    });

    it('does not kill an unowned process that replaced the workspace task entry', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32' as NodeJS.Platform);
      const ownedTask = { ...createProcessTask('func host start', workspaceFolder), name: 'owned', source: 'logic-apps' } as vscode.Task;
      const unownedTask = {
        ...createProcessTask('func host start --port 7072', workspaceFolder),
        name: 'unowned',
        source: 'user',
      } as vscode.Task;
      trackFuncTaskForCleanup(ownedTask);
      runningFuncTaskMap.set(workspaceFolder, { processId: 999, startTime: Date.now(), task: unownedTask });
      vi.spyOn(cp, 'exec');

      await stopAllFuncTasks();

      expect(cp.exec).not.toHaveBeenCalled();
      expect(runningFuncTaskMap.get(workspaceFolder)?.processId).toBe(999);
    });

    it('immediately cleans up an owned func task that starts during shutdown', async () => {
      vi.spyOn(os, 'platform').mockReturnValue('win32' as NodeJS.Platform);
      const taskkillCallbacks: Array<() => void> = [];
      vi.spyOn(cp, 'exec').mockImplementation(((_command: string, callback?: cp.ExecException | any) => {
        taskkillCallbacks.push(() => callback?.(null, '', ''));
        return {} as cp.ChildProcess;
      }) as any);
      registerFuncHostTaskEvents();
      const startHandler = registerEventMock.mock.calls.find((call) => call[0] === 'azureLogicAppsStandard.onDidStartTask')?.[2];

      const firstTask = createProcessTask('func host start', workspaceFolder);
      const lateTask = createProcessTask('func host start', {
        name: 'logicapp-two',
        index: 1,
        uri: vscode.Uri.file('D:\\test\\logicapp-two'),
      } as vscode.WorkspaceFolder);
      trackFuncTaskForCleanup(firstTask);
      trackFuncTaskForCleanup(lateTask);
      runningFuncTaskMap.set(workspaceFolder, { processId: 100, startTime: Date.now() });

      const stopPromise = stopAllFuncTasks();
      await Promise.resolve();

      const lateExecution = {
        task: lateTask,
        terminate: vi.fn(),
      } as unknown as vscode.TaskExecution;
      const lateStartPromise = startHandler(
        { errorHandling: {}, telemetry: {} },
        {
          execution: lateExecution,
          processId: 200,
        }
      );
      await Promise.resolve();

      expect(lateExecution.terminate).toHaveBeenCalledOnce();
      expect(cp.exec).toHaveBeenCalledWith('taskkill /PID 200 /T /F', expect.any(Function));

      for (const callback of taskkillCallbacks) {
        callback();
      }
      await Promise.all([lateStartPromise, stopPromise]);

      expect(runningFuncTaskMap.size).toBe(0);
      expect(ownedFuncTasks).toHaveLength(0);
    });
  });
});
