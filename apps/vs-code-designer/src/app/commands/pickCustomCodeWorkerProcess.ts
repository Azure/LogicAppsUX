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
import { ext } from '../../extensionVariables';
import { Platform } from '@microsoft/vscode-extension-logic-apps';

type OSAgnosticProcess = { command: string | undefined; pid: number | string };

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
    const errorMessage =
      'Failed to find a running func task for the logic app "{0}". The logic app must be running to attach the function debugger.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage.replace('{0}', logicAppName);
    throw new Error(localize('noFuncTask', errorMessage, logicAppName));
  }

  context.telemetry.properties.lastStep = 'pickNetHostChildProcess';
  const customCodeNetHostProcess = await pickCustomCodeWorkerChildProcess(taskInfo, false, isCodeless);
  if (!customCodeNetHostProcess) {
    context.telemetry.properties.result = 'Failed';
    ext.outputChannel.appendLog(
      localize(
        'customCodeNet8ChildProcessNotFound',
        `Failed to find the .NET host child process for the functions project for logic app "${logicAppName}". This may be due to the logic app not having a custom code action.`
      )
    );
    return undefined;
  }

  context.telemetry.properties.result = 'Succeeded';
  return customCodeNetHostProcess;
}

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
  const customCodeNetFxWorkerProcess = await pickCustomCodeWorkerChildProcess(taskInfo, true);
  if (!customCodeNetFxWorkerProcess) {
    context.telemetry.properties.result = 'Failed';
    ext.outputChannel.appendLog(
      localize(
        'customCodeNetFxChildProcessNotFound',
        `Failed to find the CustomCodeNetFxWorker process for logic app "${logicAppName}". This may be due to the logic app not having a custom code action.`
      )
    );
    return undefined;
  }

  context.telemetry.properties.result = 'Succeeded';
  return customCodeNetFxWorkerProcess;
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
