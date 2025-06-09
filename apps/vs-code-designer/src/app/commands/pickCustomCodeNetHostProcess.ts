/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform } from '../../constants';
import { getMatchingWorkspaceFolder } from '../debug/validatePreDebug';
import { runningFuncTaskMap } from '../utils/funcCoreTools/funcHostTask';
import type { IRunningFuncTask } from '../utils/funcCoreTools/funcHostTask';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type * as vscode from 'vscode';
import * as path from 'path';
import { getUnixChildren, getWindowsChildren, pickChildProcess } from './pickFuncProcess';
import { localize } from '../../localize';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';

type OSAgnosticProcess = { command: string | undefined; pid: number | string };

/**
 * Picks the .NET host child process for the custom code project by polling the running function tasks for the workspace folder.
 * @param context The action context.
 * @param debugConfig The debug configuration.
 * @returns A promise that resolves to the .NET host child process ID or undefined if not found.
 */
export async function pickCustomCodeNetHostProcess(
  context: IActionContext,
  debugConfig: vscode.DebugConfiguration
): Promise<string | undefined> {
  context.telemetry.properties.lastStep = 'getMatchingWorkspaceFolder';
  const workspaceFolder: vscode.WorkspaceFolder = getMatchingWorkspaceFolder(debugConfig);
  if (!workspaceFolder) {
    const errorMessage = 'Failed to find a workspace folder matching the debug configuration.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage;
    throw new Error(localize('noMatchingWorkspaceFolder', errorMessage));
  }

  context.telemetry.properties.lastStep = 'tryGetLogicAppProjectRoot';
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  if (!projectPath) {
    const errorMessage = 'Failed to find a logic app project in the workspace folder "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage.replace('{0}', workspaceFolder?.uri?.fsPath);
    throw new Error(localize('noLogicAppProject', errorMessage, workspaceFolder?.uri?.fsPath));
  }
  const logicAppName = path.basename(projectPath);

  context.telemetry.properties.lastStep = 'getRunningFuncTask';
  let taskInfo: IRunningFuncTask | undefined;
  const maxRetries = 10;
  const delayMs = 5000;
  for (let i = 0; i < maxRetries; i++) {
    taskInfo = runningFuncTaskMap.get(workspaceFolder);
    if (taskInfo) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (!taskInfo) {
    const errorMessage =
      'Failed to find a running func task for the logic app "{0}". The logic app must be running to attach the function debugger.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('noFuncTask', errorMessage, logicAppName));
  }

  context.telemetry.properties.lastStep = 'pickNetHostChildProcess';
  let customCodeNetHostProcess: string | undefined;
  for (let i = 0; i < maxRetries; i++) {
    customCodeNetHostProcess = await pickNetHostChildProcess(taskInfo);
    if (customCodeNetHostProcess) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (!customCodeNetHostProcess) {
    const errorMessage = 'Failed to find the .NET host child process for the functions project for logic app "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('netHostProcessNotFound', errorMessage, logicAppName));
  }

  context.telemetry.properties.result = 'Succeeded';
  return customCodeNetHostProcess;
}

/**
 * Picks the .NET host child process of the running function task for the custom code project.
 * @param context The action context.
 * @param workspaceFolder The workspace folder containing the logic app.
 * @param projectPath The path to the logic app project root.
 * @returns A promise that resolves to the .NET host child process ID or undefined if not found.
 */
export async function pickCustomCodeNetHostProcessInternal(
  context: IActionContext,
  workspaceFolder: vscode.WorkspaceFolder,
  projectPath: string
): Promise<string | undefined> {
  const logicAppName = path.basename(projectPath);

  context.telemetry.properties.lastStep = 'getRunningFuncTask';
  const taskInfo = runningFuncTaskMap.get(workspaceFolder);
  if (!taskInfo) {
    const errorMessage =
      'Failed to find a running func task for the logic app "{0}". The logic app must be running to attach the function debugger.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('noFuncTask', errorMessage, logicAppName));
  }

  context.telemetry.properties.lastStep = 'pickNetHostChildProcess';
  const customCodeNetHostProcess = await pickNetHostChildProcess(taskInfo);
  if (!customCodeNetHostProcess) {
    const errorMessage = 'Failed to find the .NET host child process for the functions project for logic app "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('netHostProcessNotFound', errorMessage, logicAppName));
  }

  context.telemetry.properties.result = 'Succeeded';
  return customCodeNetHostProcess;
}

export async function pickNetHostChildProcess(taskInfo: IRunningFuncTask): Promise<string | undefined> {
  const funcPid = Number(await pickChildProcess(taskInfo));
  if (!funcPid) {
    return undefined;
  }

  const children: OSAgnosticProcess[] =
    process.platform === Platform.windows ? await getWindowsChildren(funcPid) : await getUnixChildren(funcPid);
  let child: OSAgnosticProcess | undefined = children.reverse().find((c) => /(func|dotnet)(\.exe)?$/i.test(c.command || ''));

  // If child is null or undefined, look one level deeper in child processes
  if (!child) {
    for (const possibleParent of children) {
      const childrenOfChild =
        process.platform === Platform.windows
          ? await getWindowsChildren(Number(possibleParent.pid))
          : await getUnixChildren(Number(possibleParent.pid));

      child = childrenOfChild.reverse().find((c) => /(func|dotnet)(\.exe)?$/i.test(c.command || ''));
      if (child) {
        break;
      }
    }
  }
  return child ? child.pid.toString() : undefined;
}
