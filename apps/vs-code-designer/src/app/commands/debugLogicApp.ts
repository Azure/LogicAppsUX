/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import * as path from 'path';
import { pickFuncProcessInternal } from './pickFuncProcess';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { tryGetLogicAppProjectRoot } from '../utils/verifyIsProject';
import { pickCustomCodeNetFxWorkerProcessInternal, pickCustomCodeNetHostProcessInternal } from './pickCustomCodeWorkerProcess';

export async function debugLogicApp(
  context: IActionContext,
  debugConfig: vscode.DebugConfiguration,
  workspaceFolder: vscode.WorkspaceFolder | undefined
): Promise<void> {
  const workspacePath = workspaceFolder?.uri?.fsPath ?? 'unknown workspace';
  const projectPath: string | undefined = await tryGetLogicAppProjectRoot(context, workspaceFolder);
  if (!projectPath) {
    const errorMessage = 'Failed to find a logic app project in the workspace folder "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage.replace('{0}', workspacePath);
    throw new Error(localize('noLogicAppProject', errorMessage, workspacePath));
  }
  const logicAppName = path.basename(projectPath);
  const resolvedWorkspaceFolder = workspaceFolder ?? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(projectPath));

  if (!resolvedWorkspaceFolder) {
    const errorMessage = 'Failed to find a workspace folder for the logic app project "{0}".';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage.replace('{0}', projectPath);
    throw new Error(localize('noWorkspaceFolder', errorMessage, projectPath));
  }

  ext.outputChannel.appendLog(
    localize(
      'logicAppDebugAttachStart',
      'Starting logic app debug attach for "{0}" in workspace "{1}". funcRuntime={2}, customCodeRuntime={3}, isCodeless={4}.',
      logicAppName,
      workspacePath,
      debugConfig.funcRuntime ?? 'undefined',
      debugConfig.customCodeRuntime ?? 'none',
      String(Boolean(debugConfig.isCodeless))
    )
  );

  const funcProcessId = await pickFuncProcessInternal(context, debugConfig, resolvedWorkspaceFolder, projectPath);
  const logicAppLaunchConfig = {
    name: localize('attachToNetFunc', `Debug logic app ${logicAppName}`),
    type: debugConfig.funcRuntime,
    request: 'attach',
    processId: funcProcessId,
  };
  ext.outputChannel.appendLog(
    localize(
      'workflowDebugAttachAttempt',
      'Attempting workflow debug attach for "{0}" using runtime "{1}" and process ID "{2}".',
      logicAppName,
      String(logicAppLaunchConfig.type),
      String(logicAppLaunchConfig.processId)
    )
  );
  const workflowAttachStarted = await vscode.debug.startDebugging(resolvedWorkspaceFolder, logicAppLaunchConfig);
  ext.outputChannel.appendLog(
    localize(
      'workflowDebugAttachResult',
      'Workflow debug attach request for "{0}" completed with result "{1}".',
      logicAppName,
      String(workflowAttachStarted)
    )
  );

  if (debugConfig.customCodeRuntime) {
    let functionLaunchConfig: vscode.DebugConfiguration;
    if (debugConfig.customCodeRuntime === 'coreclr') {
      const customCodeNetHostProcessId = await pickCustomCodeNetHostProcessInternal(
        context,
        resolvedWorkspaceFolder,
        projectPath,
        debugConfig.isCodeless
      );
      functionLaunchConfig = {
        name: localize('attachToCustomCodeFunc', 'Debug local function'),
        type: debugConfig.customCodeRuntime,
        request: 'attach',
        processId: customCodeNetHostProcessId,
      };
    } else if (debugConfig.customCodeRuntime === 'clr') {
      const customCodeNetFxWorkerProcessId = await pickCustomCodeNetFxWorkerProcessInternal(context, resolvedWorkspaceFolder, projectPath);
      functionLaunchConfig = {
        name: localize('attachToFunc', 'Debug local function'),
        type: debugConfig.customCodeRuntime,
        request: 'attach',
        processId: customCodeNetFxWorkerProcessId,
      };
    } else {
      const errorMessage = 'Unsupported custom code runtime "{0}".';
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.errorMessage = errorMessage.replace('{0}', debugConfig.customCodeRuntime);
      throw new Error(localize('unsupportedCustomCodeRuntime', errorMessage, debugConfig.customCodeRuntime));
    }

    if (functionLaunchConfig?.processId) {
      ext.outputChannel.appendLog(
        localize(
          'customCodeDebugAttachAttempt',
          'Attempting custom code debug attach for "{0}" using runtime "{1}" and process ID "{2}".',
          logicAppName,
          String(functionLaunchConfig.type),
          String(functionLaunchConfig.processId)
        )
      );
      const customCodeAttachStarted = await vscode.debug.startDebugging(resolvedWorkspaceFolder, functionLaunchConfig);
      ext.outputChannel.appendLog(
        localize(
          'customCodeDebugAttachResult',
          'Custom code debug attach request for "{0}" completed with result "{1}".',
          logicAppName,
          String(customCodeAttachStarted)
        )
      );
    } else {
      ext.outputChannel.appendLog(
        localize(
          'customCodeDebugAttachSkipped',
          'Skipping custom code debug attach for "{0}" because no custom code worker process was found.',
          logicAppName
        )
      );
    }
    context.telemetry.properties.result = 'Succeeded';
  }
}
