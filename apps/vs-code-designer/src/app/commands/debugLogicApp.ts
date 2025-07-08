/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import * as path from 'path';
import { pickFuncProcessInternal } from './pickFuncProcess';
import { localize } from '../../localize';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';
import { pickCustomCodeNetHostProcessInternal } from './pickCustomCodeNetHostProcess';

export async function debugLogicApp(
  context: IActionContext,
  debugConfig: vscode.DebugConfiguration,
  workspaceFolder: vscode.WorkspaceFolder | undefined
): Promise<void> {
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  if (!projectPath) {
    const errorMessage = 'Failed to find a logic app project in the workspace folder "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage.replace('{0}', workspaceFolder?.uri?.fsPath);
    throw new Error(localize('noLogicAppProject', errorMessage, workspaceFolder?.uri?.fsPath));
  }
  const logicAppName = path.basename(projectPath);

  const funcProcessId = await pickFuncProcessInternal(context, debugConfig, workspaceFolder, projectPath);
  const logicAppLaunchConfig = {
    name: localize('attachToNetFunc', `Debug logic app ${logicAppName}`),
    type: debugConfig.funcRuntime,
    request: 'attach',
    processId: funcProcessId,
  };
  await vscode.debug.startDebugging(workspaceFolder, logicAppLaunchConfig);

  if (debugConfig.customCodeRuntime) {
    let functionLaunchConfig: vscode.DebugConfiguration;
    if (debugConfig.customCodeRuntime === 'coreclr') {
      const customCodeNetHostProcessId = await pickCustomCodeNetHostProcessInternal(context, workspaceFolder, projectPath);
      functionLaunchConfig = {
        name: localize('attachToCustomCodeFunc', 'Debug local function'),
        type: debugConfig.customCodeRuntime,
        request: 'attach',
        processId: customCodeNetHostProcessId,
      };
    } else if (debugConfig.customCodeRuntime === 'clr') {
      functionLaunchConfig = {
        name: localize('attachToFunc', 'Debug local function'),
        type: debugConfig.customCodeRuntime,
        request: 'attach',
        processName: 'Microsoft.Azure.Workflows.Functions.CustomCodeNetFxWorker.exe',
      };
    } else {
      const errorMessage = 'Unsupported custom code runtime "{0}".';
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.errorMessage = errorMessage.replace('{0}', debugConfig.customCodeRuntime);
      throw new Error(localize('unsupportedCustomCodeRuntime', errorMessage, debugConfig.customCodeRuntime));
    }

    await vscode.debug.startDebugging(workspaceFolder, functionLaunchConfig);
    context.telemetry.properties.result = 'Succeeded';
  }
}
