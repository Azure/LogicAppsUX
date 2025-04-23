/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Platform } from '../../constants';
import { getMatchingWorkspaceFolder } from '../debug/validatePreDebug';
import { runningFuncTaskMap } from '../utils/funcCoreTools/funcHostTask';
import type { IRunningFuncTask } from '../utils/funcCoreTools/funcHostTask';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { getUnixChildren, getWindowsChildren, pickChildProcess } from './pickFuncProcess';
import { getCustomCodeFunctionsProjectMetadata } from '../utils/customCodeUtils';
import { localize } from '../../localize';

type OSAgnosticProcess = { command: string | undefined; pid: number | string };

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

  context.telemetry.properties.lastStep = 'getCustomCodeFunctionsProjectMetadata';
  const functionsProjectMetadata = await getCustomCodeFunctionsProjectMetadata(workspaceFolder.uri.fsPath);
  if (!functionsProjectMetadata) {
    const errorMessage = 'Failed to load metadata for custom code functions project at "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage.replace('{0}', workspaceFolder.uri.fsPath);
    throw new Error(localize('noCustomCodeFunctionsProjectMetadata', errorMessage, workspaceFolder.uri.fsPath));
  }

  context.telemetry.properties.lastStep = 'findLogicAppFolder';
  const logicAppFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders?.find(
    (workspaceFolder) => workspaceFolder.name === functionsProjectMetadata?.logicAppName
  );
  if (!logicAppFolder) {
    const errorMessage = 'Failed to find a logic app folder matching the custom code functions project at "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage.replace('{0}', workspaceFolder.uri.fsPath);
    throw new Error(localize('noMatchingLogicAppFolder', errorMessage, workspaceFolder.uri.fsPath));
  }

  context.telemetry.properties.lastStep = 'getRunningFuncTask';
  const taskInfo: IRunningFuncTask | undefined = runningFuncTaskMap.get(logicAppFolder);
  if (!taskInfo) {
    const errorMessage =
      'Failed to find a running func task for the logic app "{0}" corresponding to the functions project "{1}". The logic app must be running to attach the debugger.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage
      .replace('{0}', functionsProjectMetadata.logicAppName)
      .replace('{1}', functionsProjectMetadata.functionAppName);
    throw new Error(localize('noFuncTask', errorMessage, functionsProjectMetadata.logicAppName, functionsProjectMetadata.functionAppName));
  }

  context.telemetry.properties.lastStep = 'pickNetHostChildProcess';
  const customCodeNetHostProcess = await pickNetHostChildProcess(taskInfo);
  if (!customCodeNetHostProcess) {
    const errorMessage = 'Failed to find the .NET host process for the functions project "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.error = errorMessage.replace('{0}', functionsProjectMetadata.functionAppName);
    throw new Error(localize('netHostProcessNotFound', errorMessage, functionsProjectMetadata.functionAppName));
  }

  context.telemetry.properties.result = 'Succeeded';
  return customCodeNetHostProcess;
}

async function pickNetHostChildProcess(taskInfo: IRunningFuncTask): Promise<string | undefined> {
  const funcPid = Number(await pickChildProcess(taskInfo));
  if (!funcPid) {
    return undefined;
  }

  const children: OSAgnosticProcess[] =
    process.platform === Platform.windows ? await getWindowsChildren(funcPid) : await getUnixChildren(funcPid);
  const child: OSAgnosticProcess | undefined = children.reverse().find((c) => /(dotnet)(\.exe|)$/i.test(c.command || ''));
  return child ? child.pid.toString() : undefined;
}
