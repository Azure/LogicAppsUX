/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { extensionContext } from '../../../constants';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';
import { createLogicAppProject } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { isLogicAppProject } from '../../utils/verifyIsProject';
import { hasCodefulSdkReference } from '../../utils/codeful';
import {
  tryGetLogicAppCustomCodeFunctionsProjects,
  getAllCustomCodeFunctionsProjects,
  getEligibleLogicAppFoldersForCustomCode,
} from '../../utils/customCodeUtils';
import * as vscode from 'vscode';
import * as path from 'path';

/**
 * Command handler for the "Add .NET custom code" Explorer context-menu action.
 * Opens the Create Project wizard pre-configured for custom-code with the target Logic App locked.
 */
export async function addCustomCode(context: IActionContext, node?: vscode.Uri): Promise<void> {
  if (!node) {
    context.telemetry.properties.result = 'Failed';
    vscode.window.showErrorMessage(localize('addCustomCodeNoUri', 'This command must be invoked from the Explorer context menu on a Logic App project folder.'));
    return;
  }

  const projectPath = node.fsPath;
  context.telemetry.properties.lastStep = 'validateFolder';
  if (!(await isLogicAppProject(projectPath))) {
    context.telemetry.properties.result = 'Failed';
    vscode.window.showErrorMessage(localize('addCustomCodeNotLogicApp', 'The selected folder is not a Logic App project.'));
    return;
  }

  if (await hasCodefulSdkReference(projectPath)) {
    context.telemetry.properties.result = 'Failed';
    vscode.window.showErrorMessage(localize('addCustomCodeIsCodeful', 'This Logic App already uses a .NET SDK project. Custom code is not applicable.'));
    return;
  }

  context.telemetry.properties.lastStep = 'checkExistingCustomCode';
  const existingCustomCode = await tryGetLogicAppCustomCodeFunctionsProjects(projectPath);
  if (existingCustomCode && existingCustomCode.length > 0) {
    context.telemetry.properties.result = 'Failed';
    vscode.window.showErrorMessage(
      localize(
        'addCustomCodeAlreadyExists',
        'This Logic App already has an associated custom code project: "{0}".',
        path.basename(existingCustomCode[0])
      )
    );
    return;
  }

  if (!vscode.workspace.workspaceFile) {
    context.telemetry.properties.result = 'Failed';
    vscode.window.showErrorMessage(localize('addCustomCodeNoWorkspace', 'Please open a Logic App workspace (.code-workspace) before adding custom code.'));
    return;
  }

  const workspaceRootFolder = path.dirname(vscode.workspace.workspaceFile.fsPath);
  const logicAppName = path.basename(projectPath);

  context.telemetry.properties.lastStep = 'readWorkspace';
  const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.workspace.workspaceFile);
  const workspaceFileJson = JSON.parse(workspaceFileContent.toString());

  const existingFolders = await getExistingFoldersOnDisk(workspaceRootFolder);

  ext.outputChannel.appendLog(`[addCustomCode] target=${logicAppName}, workspaceRoot=${workspaceRootFolder}`);

  context.telemetry.properties.lastStep = 'openWizard';
  await createWorkspaceWebviewCommandHandler({
    panelName: localize('addCustomCodeProject', 'Add .NET custom code'),
    panelGroupKey: ext.webViewKey.createLogicApp,
    projectName: ProjectName.createLogicApp,
    createCommand: ExtensionCommand.createLogicApp,
    createHandler: async (data: any) => {
      await callWithTelemetryAndErrorHandling('addCustomCode.createHandler', async (actionContext: IActionContext) => {
        await createLogicAppProject(actionContext, data, workspaceRootFolder);
      });
      // Refresh context keys after successful creation
      await callWithTelemetryAndErrorHandling('addCustomCode.refreshContext', async (actionContext: IActionContext) => {
        vscode.commands.executeCommand(
          'setContext',
          extensionContext.customCodeFunctionsFolders,
          await getAllCustomCodeFunctionsProjects(actionContext)
        );
        vscode.commands.executeCommand(
          'setContext',
          extensionContext.customCodeEligibleLogicAppFolders,
          await getEligibleLogicAppFoldersForCustomCode()
        );
      });
    },
    dialogOptions: {
      workspace: {
        canSelectMany: false,
        openLabel: localize('selectWorkspaceParentFolder', 'Select workspace parent folder'),
        canSelectFiles: false,
        canSelectFolders: true,
      },
    },
    extraInitializeData: {
      workspaceFileJson,
      logicAppsWithoutCustomCode: [{ label: logicAppName, description: projectPath, data: projectPath }],
      existingFolders,
      isAddCustomCodeFlow: true,
      preselectedLogicAppName: logicAppName,
      preselectedLogicAppType: ProjectType.customCode,
    },
  });
}

/**
 * Enumerates all directory names in the workspace root folder.
 */
async function getExistingFoldersOnDisk(workspaceRootFolder: string): Promise<string[]> {
  try {
    const rootUri = vscode.Uri.file(workspaceRootFolder);
    const entries = await vscode.workspace.fs.readDirectory(rootUri);
    return entries.filter(([, type]) => type === vscode.FileType.Directory).map(([name]) => name);
  } catch {
    return [];
  }
}
