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
import { emitFuncDiagnostic, funcTaskState } from './funcTaskDiagnostics';
export interface IRunningFuncTask {
  startTime: number;
  processId: number;
  childProcessId?: any[];
}

export const runningFuncTaskMap: Map<vscode.WorkspaceFolder | vscode.TaskScope, IRunningFuncTask> = new Map();

export function scopeMatchesWorkspace(
  scope: vscode.WorkspaceFolder | vscode.TaskScope | undefined,
  workspaceFolder: vscode.WorkspaceFolder
): boolean {
  if (scope === workspaceFolder) {
    return true;
  }
  if (typeof scope === 'object' && 'uri' in scope) {
    const scopePath = path.normalize(scope.uri.fsPath);
    const workspacePath = path.normalize(workspaceFolder.uri.fsPath);
    return process.platform === Platform.windows ? scopePath.toLowerCase() === workspacePath.toLowerCase() : scopePath === workspacePath;
  }
  return false;
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
  const recordDelete = (scope: vscode.WorkspaceFolder | vscode.TaskScope, mutationApplied: boolean) =>
    emitFuncDiagnostic('events', 'func-map-delete', () => ({
      workspace: workspaceFolder.uri.fsPath,
      scopeExact: scope === workspaceFolder,
      scopeMatches: scopeMatchesWorkspace(scope, workspaceFolder),
      mapCount: runningFuncTaskMap.size,
      trackedPid: runningFuncTaskMap.get(scope)?.processId,
      childCount: runningFuncTaskMap.get(scope)?.childProcessId?.length ?? 0,
      mutationApplied,
    }));
  recordDelete(workspaceFolder, false);
  runningFuncTaskMap.delete(workspaceFolder);
  recordDelete(workspaceFolder, true);
  for (const scope of runningFuncTaskMap.keys()) {
    if (scopeMatchesWorkspace(scope, workspaceFolder)) {
      recordDelete(scope, false);
      runningFuncTaskMap.delete(scope);
      recordDelete(scope, true);
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

async function killFuncProcessTree(runningFuncTask: IRunningFuncTask): Promise<void> {
  if (os.platform() === Platform.windows) {
    await Promise.all([
      execAndIgnore(`taskkill /PID ${runningFuncTask.processId} /T /F`),
      ...(runningFuncTask.childProcessId || []).filter(Boolean).map((pid) => execAndIgnore(`taskkill /PID ${pid} /T /F`)),
    ]);
  } else {
    await spawnAndIgnore('kill', ['-9'].concat(`${runningFuncTask.processId}`));
  }
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
  emitFuncDiagnostic('events', 'func-events-register', () => ({ mapCount: runningFuncTaskMap.size, settled: false }));
  registerEvent(
    extensionEvent.onDidStartTask,
    vscode.tasks.onDidStartTaskProcess,
    async (context: IActionContext, e: vscode.TaskProcessStartEvent) => {
      context.errorHandling.suppressDisplay = true;
      context.telemetry.suppressIfSuccessful = true;
      const classified = e.execution.task.scope !== undefined && isFuncHostTask(e.execution.task);
      const snapshot = () => ({
        ...funcTaskState(e.execution.task, e.execution),
        classified,
        scopeExact: vscode.workspace.workspaceFolders?.some((folder) => e.execution.task.scope === folder) ?? false,
        scopeMatches: vscode.workspace.workspaceFolders?.some((folder) => scopeMatchesWorkspace(e.execution.task.scope, folder)) ?? false,
        mapCount: runningFuncTaskMap.size,
        pid: e.processId,
        trackedPid: e.execution.task.scope !== undefined ? runningFuncTaskMap.get(e.execution.task.scope)?.processId : undefined,
        childCount:
          e.execution.task.scope !== undefined ? (runningFuncTaskMap.get(e.execution.task.scope)?.childProcessId?.length ?? 0) : 0,
      });
      emitFuncDiagnostic('events', 'func-task-start-event', snapshot);
      if (e.execution.task.scope !== undefined && classified) {
        runningFuncTaskMap.set(e.execution.task.scope, { startTime: Date.now(), processId: e.processId });
        emitFuncDiagnostic('events', 'func-map-set', snapshot);
      }
    }
  );

  registerEvent(
    extensionEvent.onDidEndTask,
    vscode.tasks.onDidEndTaskProcess,
    async (context: IActionContext, e: vscode.TaskProcessEndEvent) => {
      context.errorHandling.suppressDisplay = true;
      context.telemetry.suppressIfSuccessful = true;
      const classified = e.execution.task.scope !== undefined && isFuncHostTask(e.execution.task);
      const snapshot = () => ({
        ...funcTaskState(e.execution.task, e.execution),
        classified,
        scopeExact: vscode.workspace.workspaceFolders?.some((folder) => e.execution.task.scope === folder) ?? false,
        scopeMatches: vscode.workspace.workspaceFolders?.some((folder) => scopeMatchesWorkspace(e.execution.task.scope, folder)) ?? false,
        mapCount: runningFuncTaskMap.size,
        exitCode: e.exitCode,
        trackedPid: e.execution.task.scope !== undefined ? runningFuncTaskMap.get(e.execution.task.scope)?.processId : undefined,
        childCount:
          e.execution.task.scope !== undefined ? (runningFuncTaskMap.get(e.execution.task.scope)?.childProcessId?.length ?? 0) : 0,
      });
      emitFuncDiagnostic('events', 'func-task-end-event', snapshot);
      if (e.execution.task.scope !== undefined && classified) {
        runningFuncTaskMap.delete(e.execution.task.scope);
        emitFuncDiagnostic('events', 'func-map-delete', snapshot);
        ext.workflowRuntimePort = undefined;
      }
    }
  );

  registerEvent(extensionEvent.onDidTerminateDebugSession, vscode.debug.onDidTerminateDebugSession, stopFuncTaskIfRunning);
  emitFuncDiagnostic('events', 'func-events-register', () => ({ mapCount: runningFuncTaskMap.size, settled: true }));
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
