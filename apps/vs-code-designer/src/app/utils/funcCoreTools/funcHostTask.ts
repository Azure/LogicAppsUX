/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { defaultFuncPort, localSettingsFileName, stopFuncTaskPostDebugSetting } from '../../../constants';
import { getLocalSettingsJson } from '../appSettings/localSettings';
import { tryGetFunctionProjectRoot } from '../verifyIsProject';
import { getWorkspaceSetting } from '../vsCodeConfig/settings';
//import { getFunctionsCommand } from './funcVersion';
import { delay } from '@azure/ms-rest-js';
import { isString } from '@microsoft/utils-logic-apps';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { registerEvent } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import * as vscode from 'vscode';

export interface IRunningFuncTask {
  startTime: number;
  processId: number;
}

export const runningFuncTaskMap: Map<vscode.WorkspaceFolder | vscode.TaskScope, IRunningFuncTask> = new Map();

/**
 * Returns wheter the task is a func host start task.
 * @param {vscode.Task} task - Function task.
 * @returns {number} Returns true if the task is a func host start task, otherwise returns false.
 */
export function isFuncHostTask(task: vscode.Task): boolean {
  const commandLine: string | undefined = task.execution && (task.execution as vscode.ShellExecution).commandLine;
  if (task.definition.type == 'shell') {
    const command = (task.execution as vscode.ShellExecution).command?.toString();
    const funcRegex = new RegExp('\\$\\{config:azureLogicAppsStandard\\.funcCoreToolsBinaryPath\\}');
    // check for args?
    return funcRegex.test(command);
  }
  return /func (host )?start/i.test(commandLine || '');
}

export function registerFuncHostTaskEvents(): void {
  registerEvent(
    'azureLogicAppsStandard.onDidStartTask',
    vscode.tasks.onDidStartTaskProcess,
    async (context: IActionContext, e: vscode.TaskProcessStartEvent) => {
      context.errorHandling.suppressDisplay = true;
      context.telemetry.suppressIfSuccessful = true;
      if (e.execution.task.scope !== undefined && isFuncHostTask(e.execution.task)) {
        runningFuncTaskMap.set(e.execution.task.scope, { startTime: Date.now(), processId: e.processId });
      }
    }
  );

  registerEvent(
    'azureLogicAppsStandard.onDidEndTask',
    vscode.tasks.onDidEndTaskProcess,
    async (context: IActionContext, e: vscode.TaskProcessEndEvent) => {
      context.errorHandling.suppressDisplay = true;
      context.telemetry.suppressIfSuccessful = true;
      if (e.execution.task.scope !== undefined && isFuncHostTask(e.execution.task)) {
        runningFuncTaskMap.delete(e.execution.task.scope);
      }
    }
  );

  registerEvent('azureLogicAppsStandard.onDidTerminateDebugSession', vscode.debug.onDidTerminateDebugSession, stopFuncTaskIfRunning);
}

async function stopFuncTaskIfRunning(context: IActionContext, debugSession: vscode.DebugSession): Promise<void> {
  context.errorHandling.suppressDisplay = true;
  context.telemetry.suppressIfSuccessful = true;

  if (getWorkspaceSetting<boolean>(stopFuncTaskPostDebugSetting)) {
    if (debugSession.workspaceFolder) {
      const funcExecution: vscode.TaskExecution | undefined = vscode.tasks.taskExecutions.find((te: vscode.TaskExecution) => {
        return te.task.scope === debugSession.workspaceFolder && isFuncHostTask(te.task);
      });

      if (funcExecution) {
        context.telemetry.suppressIfSuccessful = false; // only track telemetry if it's actually the func task

        const runningFuncTask: IRunningFuncTask | undefined = runningFuncTaskMap.get(debugSession.workspaceFolder);
        if (runningFuncTask !== undefined) {
          // Wait at least 10 seconds after the func task started before calling `terminate` since that will remove task output and we want the user to see any startup errors
          await delay(Math.max(0, runningFuncTask.startTime + 10 * 1000 - Date.now()));

          if (runningFuncTaskMap.get(debugSession.workspaceFolder) === runningFuncTask) {
            funcExecution.terminate();
          }
        }
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
      projectPath = await tryGetFunctionProjectRoot(context, projectPathOrTaskScope);
    }

    if (projectPath) {
      const localSettings = await getLocalSettingsJson(context, path.join(projectPath, localSettingsFileName));
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
