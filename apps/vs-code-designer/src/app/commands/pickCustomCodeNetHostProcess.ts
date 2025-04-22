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
  const workspaceFolder: vscode.WorkspaceFolder = getMatchingWorkspaceFolder(debugConfig);
  const functionsProjectMetadata = await getCustomCodeFunctionsProjectMetadata(workspaceFolder.uri.fsPath);
  const logicAppFolder: vscode.WorkspaceFolder = vscode.workspace.workspaceFolders?.find(
    (workspace) => workspace.name === functionsProjectMetadata.logicAppName
  );

  const taskInfo: IRunningFuncTask | undefined = runningFuncTaskMap.get(logicAppFolder);
  if (!taskInfo) {
    throw new Error(
      localize(
        'noFuncTask',
        'Failed to find a running func task for the logic app "{0}" corresponding to the functions project "{1}". The functions host must be running to attach the debugger.',
        functionsProjectMetadata.logicAppName,
        functionsProjectMetadata.functionAppName
      )
    );
  }

  return await pickNetHostChildProcess(taskInfo);
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
