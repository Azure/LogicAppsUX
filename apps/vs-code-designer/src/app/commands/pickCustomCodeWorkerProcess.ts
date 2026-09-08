/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { runningFuncTaskMap } from '../utils/funcCoreTools/funcHostTask';
import type { IRunningFuncTask } from '../utils/funcCoreTools/funcHostTask';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type * as vscode from 'vscode';
import * as path from 'path';
import { getUnixChildren, getWindowsChildren, pickChildProcess } from './pickFuncProcess';
import { localize } from '../../localize';
import { delay } from '../utils/delay';
import { Platform } from '@microsoft/vscode-extension-logic-apps';

type OSAgnosticProcess = { command: string | undefined; pid: number | string };

const WORKER_POLL_INTERVAL_MS = 2000;
const WORKER_POLL_TIMEOUT_MS = 30000;

/**
 * Picks the .NET host child process of the running function task for the custom code project.
 * Polls with a timeout because the worker is spawned lazily by the Functions host.
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
    const errorMessage =
      'Failed to find a running func task for the logic app "{0}". The logic app must be running to attach the function debugger.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('noFuncTask', errorMessage, logicAppName));
  }

  context.telemetry.properties.lastStep = 'pickNetHostChildProcess';
  const customCodeNetHostProcess = await pollForWorkerProcess(context, taskInfo, false, isCodeless);
  if (!customCodeNetHostProcess) {
    const errorMessage =
      'Failed to find the .NET host child process for the functions project for logic app "{0}". This may be due to the logic app not having a custom code action.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('customCodeNet8ChildProcessNotFound', errorMessage, logicAppName));
  }

  return customCodeNetHostProcess;
}

/**
 * Picks the CustomCodeNetFxWorker child process of the running function task.
 * Polls with a timeout because the worker is spawned lazily by the Functions host.
 */
export async function pickCustomCodeNetFxWorkerProcessInternal(
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
    context.telemetry.properties.errorMessage = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('noFuncTask', errorMessage, logicAppName));
  }

  context.telemetry.properties.lastStep = 'pickNetFxWorkerChildProcess';
  const customCodeNetFxWorkerProcess = await pollForWorkerProcess(context, taskInfo, true, true);
  if (!customCodeNetFxWorkerProcess) {
    const errorMessage =
      'Failed to find the CustomCodeNetFxWorker process for logic app "{0}". This may be due to the logic app not having a custom code action.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('customCodeNetFxChildProcessNotFound', errorMessage, logicAppName));
  }

  return customCodeNetFxWorkerProcess;
}

/**
 * Polls for a custom code worker child process until it appears or the timeout elapses.
 * Worker processes are spawned lazily by the Functions host, so a single snapshot may
 * miss them if they haven't started yet.
 */
async function pollForWorkerProcess(
  context: IActionContext,
  taskInfo: IRunningFuncTask,
  isNetFxWorker: boolean,
  isCodeless: boolean
): Promise<string | undefined> {
  const startTime = Date.now();

  while (Date.now() - startTime < WORKER_POLL_TIMEOUT_MS) {
    const pid = await pickCustomCodeWorkerChildProcess(taskInfo, isNetFxWorker, isCodeless);
    if (pid) {
      context.telemetry.measurements.workerWaitDuration = (Date.now() - startTime) / 1000;
      return pid;
    }
    await delay(WORKER_POLL_INTERVAL_MS);
  }

  context.telemetry.measurements.workerWaitDuration = (Date.now() - startTime) / 1000;
  return undefined;
}

export async function pickCustomCodeWorkerChildProcess(
  taskInfo: IRunningFuncTask,
  isNetFxWorker: boolean,
  isCodeless = true
): Promise<string | undefined> {
  const funcPid = Number(await pickChildProcess(taskInfo));
  if (!funcPid) {
    return undefined;
  }

  const children: OSAgnosticProcess[] =
    process.platform === Platform.windows ? await getWindowsChildren(funcPid) : await getUnixChildren(funcPid);
  const childRegex = isNetFxWorker ? /(CustomCodeNetFxWorker)(\.exe|)?$/i : isCodeless ? /(dotnet)(\.exe|)?$/i : /(func|dotnet)(\.exe|)?$/i;
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
  } else if (isCodeless === false) {
    // NOTE(aeldridge): Codeful .NET host is a child of the child func process, so need to look one level deeper
    const childrenOfChild =
      process.platform === Platform.windows ? await getWindowsChildren(Number(child.pid)) : await getUnixChildren(Number(child.pid));

    child = childrenOfChild.reverse().find((c) => childRegex.test(c.command || ''));
  }
  return child ? child.pid.toString() : undefined;
}
