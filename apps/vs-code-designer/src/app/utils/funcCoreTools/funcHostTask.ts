/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultFuncPort, extensionEvent, stopFuncTaskPostDebugSetting } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getLocalSettingsJson } from '../appSettings/localSettings';
import { tryGetLogicAppProjectRoot } from '../verifyIsProject';
import { getWorkspaceSetting } from '../vsCodeConfig/settings';
import { isString } from '@microsoft/logic-apps-shared';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { registerEvent } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { delay } from '../delay';
import * as cp from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { Platform } from '@microsoft/vscode-extension-logic-apps';
import psTree from 'ps-tree';
import { isTaskEqual } from '../taskUtils';
export interface IRunningFuncTask {
  startTime: number;
  processId: number;
  childProcessId?: any[];
  task?: vscode.Task;
}

export const runningFuncTaskMap: Map<vscode.WorkspaceFolder | vscode.TaskScope, IRunningFuncTask> = new Map();
export const ownedFuncTasks: vscode.Task[] = [];

let isStoppingOwnedFuncTasks = false;
const pendingShutdownKills = new Set<Promise<void>>();
const pendingFuncTaskStarts = new Set<Promise<void>>();

function scopesMatch(
  firstScope: vscode.WorkspaceFolder | vscode.TaskScope | undefined,
  secondScope: vscode.WorkspaceFolder | vscode.TaskScope | undefined
): boolean {
  if (firstScope === secondScope) {
    return true;
  }
  if (typeof firstScope === 'object' && 'uri' in firstScope && typeof secondScope === 'object' && 'uri' in secondScope) {
    const firstPath = path.normalize(firstScope.uri.fsPath);
    const secondPath = path.normalize(secondScope.uri.fsPath);
    return process.platform === Platform.windows ? firstPath.toLowerCase() === secondPath.toLowerCase() : firstPath === secondPath;
  }
  return false;
}

export function scopeMatchesWorkspace(
  scope: vscode.WorkspaceFolder | vscode.TaskScope | undefined,
  workspaceFolder: vscode.WorkspaceFolder
): boolean {
  return scopesMatch(scope, workspaceFolder);
}

export function getRunningFuncTaskForWorkspace(workspaceFolder: vscode.WorkspaceFolder): IRunningFuncTask | undefined {
  const exactMatch = runningFuncTaskMap.get(workspaceFolder);
  if (exactMatch) {
    return exactMatch;
  }
  for (const [scope, runningFuncTask] of runningFuncTaskMap.entries()) {
    if (scopeMatchesWorkspace(scope, workspaceFolder)) {
      return runningFuncTask;
    }
  }
  return undefined;
}

function deleteRunningFuncTask(workspaceFolder: vscode.WorkspaceFolder): void {
  runningFuncTaskMap.delete(workspaceFolder);
  for (const scope of runningFuncTaskMap.keys()) {
    if (scopeMatchesWorkspace(scope, workspaceFolder)) {
      runningFuncTaskMap.delete(scope);
    }
  }
}

function findFuncTaskExecution(workspaceFolder: vscode.WorkspaceFolder): vscode.TaskExecution | undefined {
  return vscode.tasks.taskExecutions.find((te: vscode.TaskExecution) => {
    return scopeMatchesWorkspace(te.task.scope, workspaceFolder) && isFuncHostTask(te.task);
  });
}

async function waitForFuncTaskToStop(workspaceFolder: vscode.WorkspaceFolder, timeoutInSeconds: number): Promise<void> {
  const maxTime = Date.now() + timeoutInSeconds * 1000;
  while (Date.now() < maxTime) {
    if (!getRunningFuncTaskForWorkspace(workspaceFolder) && !findFuncTaskExecution(workspaceFolder)) {
      return;
    }
    await delay(1000);
  }
  throw new Error(
    localize(
      'failedToFindFuncHost',
      'Failed to stop previous running Functions host within "{0}" seconds. Make sure the task has stopped before you debug again.',
      timeoutInSeconds
    )
  );
}

function execAndIgnore(command: string): Promise<void> {
  return new Promise((resolve) => {
    cp.exec(command, () => resolve());
  });
}

function spawnAndIgnore(command: string, args: string[]): Promise<void> {
  return new Promise((resolve) => {
    const child = cp.spawn(command, args);
    child.on('error', () => resolve());
    child.on('close', () => resolve());
  });
}

async function getUnixProcessIds(runningFuncTask: IRunningFuncTask): Promise<Array<number | string>> {
  const descendants = await new Promise<psTree.PS[]>((resolve) => {
    psTree(runningFuncTask.processId, (_error: Error | null, children: psTree.PS[]) => resolve(children ?? []));
  });
  return [
    ...new Set([
      ...descendants.map((processInfo) => processInfo.PID),
      ...(runningFuncTask.childProcessId || []).filter(Boolean),
      runningFuncTask.processId,
    ]),
  ].reverse();
}

async function killFuncProcessTree(runningFuncTask: IRunningFuncTask): Promise<void> {
  if (os.platform() === Platform.windows) {
    await Promise.all([
      execAndIgnore(`taskkill /PID ${runningFuncTask.processId} /T /F`),
      ...(runningFuncTask.childProcessId || []).filter(Boolean).map((pid) => execAndIgnore(`taskkill /PID ${pid} /T /F`)),
    ]);
  } else {
    const processIds = await getUnixProcessIds(runningFuncTask);
    await Promise.all(processIds.map((processId) => spawnAndIgnore('kill', ['-9', `${processId}`])));
  }
}

function isOwnedFuncTask(task: vscode.Task): boolean {
  return ownedFuncTasks.some((ownedTask) => isTaskEqual(ownedTask, task));
}

function removeOwnedFuncTask(task: vscode.Task): void {
  const taskIndex = ownedFuncTasks.findIndex((ownedTask) => isTaskEqual(ownedTask, task));
  if (taskIndex >= 0) {
    ownedFuncTasks.splice(taskIndex, 1);
  }
}

function removeOwnedFuncTasksForWorkspace(workspaceFolder: vscode.WorkspaceFolder): void {
  for (let index = ownedFuncTasks.length - 1; index >= 0; index--) {
    if (scopeMatchesWorkspace(ownedFuncTasks[index].scope, workspaceFolder)) {
      ownedFuncTasks.splice(index, 1);
    }
  }
}

export function trackFuncTaskForCleanup(task: vscode.Task): void {
  if (isStoppingOwnedFuncTasks) {
    throw new Error('Cannot start the Functions host while the Logic Apps extension is shutting down.');
  }
  if (!isOwnedFuncTask(task)) {
    ownedFuncTasks.push(task);
  }
}

export async function executeFuncTaskForCleanup(task: vscode.Task): Promise<boolean> {
  if (vscode.tasks.taskExecutions.some((execution) => isTaskEqual(execution.task, task))) {
    return false;
  }

  trackFuncTaskForCleanup(task);
  let startPromise: Promise<void>;
  try {
    startPromise = Promise.resolve(vscode.tasks.executeTask(task)).then(() => undefined);
  } catch (error) {
    removeOwnedFuncTask(task);
    throw error;
  }

  pendingFuncTaskStarts.add(startPromise);
  try {
    await startPromise;
    return true;
  } catch (error) {
    removeOwnedFuncTask(task);
    throw error;
  } finally {
    pendingFuncTaskStarts.delete(startPromise);
  }
}

export function resetFuncTaskShutdownStateForTest(): void {
  isStoppingOwnedFuncTasks = false;
  pendingShutdownKills.clear();
  pendingFuncTaskStarts.clear();
  ownedFuncTasks.length = 0;
}

function hasTrackedFuncTask(task: vscode.Task): boolean {
  return [...runningFuncTaskMap.entries()].some(([scope, runningFuncTask]) =>
    runningFuncTask.task ? isTaskEqual(runningFuncTask.task, task) : scopesMatch(scope, task.scope)
  );
}

async function waitForFuncTaskExecutionsToStop(executions: vscode.TaskExecution[]): Promise<void> {
  while (true) {
    const activeExecutions = vscode.tasks.taskExecutions;
    if (!executions.some((execution) => activeExecutions.includes(execution))) {
      return;
    }
    await delay(100);
  }
}

export async function stopAllFuncTasks(): Promise<void> {
  isStoppingOwnedFuncTasks = true;
  while (pendingFuncTaskStarts.size > 0) {
    await Promise.allSettled([...pendingFuncTaskStarts]);
  }

  const ownedTasksSnapshot = [...ownedFuncTasks];
  const trackedFuncTasks = [...runningFuncTaskMap.entries()].filter(([scope, runningFuncTask]) =>
    runningFuncTask.task
      ? ownedTasksSnapshot.some((task) => isTaskEqual(task, runningFuncTask.task!))
      : ownedTasksSnapshot.some((task) => scopesMatch(scope, task.scope))
  );
  const funcExecutions = vscode.tasks.taskExecutions.filter((execution) =>
    ownedTasksSnapshot.some((task) => isTaskEqual(task, execution.task))
  );
  const executionsWithoutTrackedProcesses = funcExecutions.filter((execution) => !hasTrackedFuncTask(execution.task));

  for (const execution of funcExecutions) {
    try {
      execution.terminate();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      ext.outputChannel?.appendLog(`Failed to terminate func task during extension shutdown: ${message}`);
    }
  }

  await Promise.allSettled(trackedFuncTasks.map(([, runningFuncTask]) => killFuncProcessTree(runningFuncTask)));
  for (const [scope] of trackedFuncTasks) {
    runningFuncTaskMap.delete(scope);
  }

  await waitForFuncTaskExecutionsToStop(executionsWithoutTrackedProcesses);
  while (pendingShutdownKills.size > 0) {
    await Promise.allSettled([...pendingShutdownKills]);
  }

  ownedFuncTasks.length = 0;
  ext.workflowRuntimePort = undefined;
}

export async function stopFuncTaskForWorkspace(
  workspaceFolder: vscode.WorkspaceFolder,
  options?: { minimumRuntimeMs?: number; timeoutInSeconds?: number }
): Promise<boolean> {
  const funcExecution = findFuncTaskExecution(workspaceFolder);
  const runningFuncTask = getRunningFuncTaskForWorkspace(workspaceFolder);

  if (!funcExecution && !runningFuncTask) {
    return false;
  }

  if (runningFuncTask && options?.minimumRuntimeMs) {
    await delay(Math.max(0, runningFuncTask.startTime + options.minimumRuntimeMs - Date.now()));
  }

  const currentRunningFuncTask = getRunningFuncTaskForWorkspace(workspaceFolder);
  if (runningFuncTask && currentRunningFuncTask?.processId === runningFuncTask.processId) {
    await killFuncProcessTree(runningFuncTask);
    deleteRunningFuncTask(workspaceFolder);
  }

  funcExecution?.terminate();
  await waitForFuncTaskToStop(workspaceFolder, options?.timeoutInSeconds ?? 30);
  removeOwnedFuncTasksForWorkspace(workspaceFolder);
  return true;
}

/**
 * Returns wheter the task is a func host start task.
 * @param {vscode.Task} task - Function task.
 * @returns {number} Returns true if the task is a func host start task, otherwise returns false.
 */
export function isFuncHostTask(task: vscode.Task): boolean {
  const commandLine: string | undefined = task.execution && (task.execution as vscode.ShellExecution).commandLine;
  if (task.definition.type === 'shell') {
    const command = (task.execution as vscode.ShellExecution).command?.toString();
    if (!command) {
      return false;
    }

    const funcRegex = /\$\{config:azureLogicAppsStandard\.funcCoreToolsBinaryPath\}/;
    return funcRegex.test(command);
  }
  return /func (host )?start/i.test(commandLine || '');
}

export function registerFuncHostTaskEvents(): void {
  registerEvent(
    extensionEvent.onDidStartTask,
    vscode.tasks.onDidStartTaskProcess,
    async (context: IActionContext, e: vscode.TaskProcessStartEvent) => {
      context.errorHandling.suppressDisplay = true;
      context.telemetry.suppressIfSuccessful = true;
      if (e.execution.task.scope !== undefined && isFuncHostTask(e.execution.task)) {
        const runningFuncTask = { startTime: Date.now(), processId: e.processId, task: e.execution.task };
        runningFuncTaskMap.set(e.execution.task.scope, runningFuncTask);
        if (isStoppingOwnedFuncTasks && isOwnedFuncTask(e.execution.task)) {
          try {
            e.execution.terminate();
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            ext.outputChannel?.appendLog(`Failed to terminate late-starting func task during extension shutdown: ${message}`);
          }
          const shutdownKill = killFuncProcessTree(runningFuncTask).finally(() => {
            runningFuncTaskMap.delete(e.execution.task.scope!);
            removeOwnedFuncTask(e.execution.task);
            pendingShutdownKills.delete(shutdownKill);
          });
          pendingShutdownKills.add(shutdownKill);
          await shutdownKill;
        }
      }
    }
  );

  registerEvent(
    extensionEvent.onDidEndTask,
    vscode.tasks.onDidEndTaskProcess,
    async (context: IActionContext, e: vscode.TaskProcessEndEvent) => {
      context.errorHandling.suppressDisplay = true;
      context.telemetry.suppressIfSuccessful = true;
      if (e.execution.task.scope !== undefined && isFuncHostTask(e.execution.task)) {
        runningFuncTaskMap.delete(e.execution.task.scope);
        removeOwnedFuncTask(e.execution.task);
        ext.workflowRuntimePort = undefined;
      }
    }
  );

  registerEvent(extensionEvent.onDidTerminateDebugSession, vscode.debug.onDidTerminateDebugSession, stopFuncTaskIfRunning);
}

async function stopFuncTaskIfRunning(context: IActionContext, debugSession: vscode.DebugSession): Promise<void> {
  context.errorHandling.suppressDisplay = true;
  context.telemetry.suppressIfSuccessful = true;

  if (getWorkspaceSetting<boolean>(stopFuncTaskPostDebugSetting)) {
    if (debugSession.workspaceFolder) {
      try {
        const stopped = await stopFuncTaskForWorkspace(debugSession.workspaceFolder, { minimumRuntimeMs: 10 * 1000 });
        if (stopped) {
          context.telemetry.suppressIfSuccessful = false; // only track telemetry if it's actually the func task
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ext.outputChannel?.appendLog(`Failed to stop func task after debug session termination: ${message}`);
      }
    }
  }
}

/**
 * Gets functions port from the task, local.settings.json or the defaultPort.
 * @param {string} context - Command context.
 * @param {string} fsPath - Workflow file path.
 * @param {string} fsPath - Workflow file path.\
 * @returns {vscode.WorkspaceFolder | undefined} Workflow folder.
 */
export async function getFuncPortFromTaskOrProject(
  context: IActionContext,
  funcTask: vscode.Task | undefined,
  projectPathOrTaskScope: string | vscode.WorkspaceFolder | vscode.TaskScope
): Promise<string> {
  try {
    // First, check the task itself
    if (funcTask && isString(funcTask.definition.command)) {
      const match = funcTask.definition.command.match(/\s+(?:"|'|)(?:-p|--port)(?:"|'|)\s+(?:"|'|)([0-9]+)/i);
      if (match) {
        return match[1];
      }
    }

    // Second, check local.settings.json
    let projectPath: string | undefined;
    if (isString(projectPathOrTaskScope)) {
      projectPath = projectPathOrTaskScope;
    } else if (typeof projectPathOrTaskScope === 'object') {
      projectPath = await tryGetLogicAppProjectRoot(context, projectPathOrTaskScope, true);
    }

    if (projectPath) {
      const localSettings = await getLocalSettingsJson(context, projectPath);
      if (localSettings.Host) {
        const key = Object.keys(localSettings.Host).find((k) => k.toLowerCase() === 'localhttpport');
        if (key && localSettings.Host[key]) {
          return localSettings.Host[key];
        }
      }
    }
  } catch {
    // ignore and use default
  }

  // Finally, fall back to the default port
  return defaultFuncPort;
}
