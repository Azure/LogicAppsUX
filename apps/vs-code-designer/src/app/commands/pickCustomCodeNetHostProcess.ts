/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform } from '../../constants';
import { getMatchingWorkspaceFolder } from '../debug/validatePreDebug';
import { runningFuncTaskMap } from '../utils/funcCoreTools/funcHostTask';
import type { IRunningFuncTask } from '../utils/funcCoreTools/funcHostTask';
import { parseError, type IActionContext } from '@microsoft/vscode-azext-utils';
import type * as vscode from 'vscode';
import * as path from 'path';
import { getUnixChildren, getWindowsChildren, pickChildProcess } from './pickFuncProcess';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';

type OSAgnosticProcess = { command: string | undefined; pid: number | string };

const POLL_ATTEMPTS = 10;
const POLL_INTERVAL_MS = 5000;

function failWithTelemetry(context: IActionContext, message: string): never {
  context.telemetry.properties.result = 'Failed';
  context.telemetry.properties.error = message;
  throw new Error(message);
}

async function pollForResult<T>(operation: () => Promise<T | undefined>, maxAttempts: number, delayMs: number): Promise<T | undefined> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await operation();
    if (result !== undefined) {
      return result;
    }

    if (attempt < maxAttempts - 1) {
      await delay(delayMs);
    }
  }

  return undefined;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getNetHostChildProcessOrThrow(
  context: IActionContext,
  taskInfo: IRunningFuncTask,
  logicAppName: string,
  isCodeless: boolean,
  attempts: number,
  delayMs: number
): Promise<string> {
  context.telemetry.properties.lastStep = 'pickNetHostChildProcess';

  let processId: string | undefined;
  try {
    processId = await pollForResult(() => pickNetHostChildProcess(taskInfo, isCodeless), attempts, delayMs);
  } catch (error) {
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = parseError(error).message;
    throw error;
  }

  if (!processId) {
    failWithTelemetry(context, `Failed to find the .NET host child process for the functions project for logic app "${logicAppName}".`);
  }

  return processId;
}

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
    failWithTelemetry(context, 'Failed to find a workspace folder matching the debug configuration.');
  }

  context.telemetry.properties.lastStep = 'tryGetLogicAppProjectRoot';
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  if (!projectPath) {
    failWithTelemetry(context, `Failed to find a logic app project in the workspace folder "${workspaceFolder?.uri?.fsPath}".`);
  }
  const logicAppName = path.basename(projectPath);

  context.telemetry.properties.lastStep = 'getRunningFuncTask';
  const taskInfo: IRunningFuncTask | undefined = await pollForResult(
    async () => runningFuncTaskMap.get(workspaceFolder),
    POLL_ATTEMPTS,
    POLL_INTERVAL_MS
  );
  if (!taskInfo) {
    failWithTelemetry(
      context,
      `Failed to find a running func task for the logic app "${logicAppName}". The logic app must be running to attach the function debugger.`
    );
  }

  const customCodeNetHostProcess = await getNetHostChildProcessOrThrow(
    context,
    taskInfo,
    logicAppName,
    debugConfig.isCodeless,
    POLL_ATTEMPTS,
    POLL_INTERVAL_MS
  );

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
  projectPath: string,
  isCodeless = true
): Promise<string | undefined> {
  const logicAppName = path.basename(projectPath);

  context.telemetry.properties.lastStep = 'getRunningFuncTask';
  const taskInfo = runningFuncTaskMap.get(workspaceFolder);
  if (!taskInfo) {
    failWithTelemetry(
      context,
      `Failed to find a running func task for the logic app "${logicAppName}". The logic app must be running to attach the function debugger.`
    );
  }

  const customCodeNetHostProcess = await getNetHostChildProcessOrThrow(context, taskInfo, logicAppName, isCodeless, 1, 0);

  context.telemetry.properties.result = 'Succeeded';
  return customCodeNetHostProcess;
}

export async function pickNetHostChildProcess(taskInfo: IRunningFuncTask, isCodeless: boolean): Promise<string | undefined> {
  const funcPid = Number(await pickChildProcess(taskInfo));
  if (!funcPid) {
    return undefined;
  }

  const children: OSAgnosticProcess[] =
    process.platform === Platform.windows ? await getWindowsChildren(funcPid) : await getUnixChildren(funcPid);
  const childRegex = isCodeless ? /(dotnet)(\.exe|)?$/i : /(func|dotnet)(\.exe|)?$/i;
  let child: OSAgnosticProcess | undefined = children.reverse().find((c) => childRegex.test(c.command || ''));

  // If child is null or undefined, look one level deeper in child processes
  if (!child) {
    for (const possibleParent of children) {
      const childrenOfChild =
        process.platform === Platform.windows
          ? await getWindowsChildren(Number(possibleParent.pid))
          : await getUnixChildren(Number(possibleParent.pid));

      child = childrenOfChild.reverse().find((c) => childRegex.test(c.command || ''));
      if (child) {
        break;
      }
    }
  }
  return child ? child.pid.toString() : undefined;
}
