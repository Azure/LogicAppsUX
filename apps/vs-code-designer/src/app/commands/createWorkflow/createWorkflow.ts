/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';
import { localize } from '../../../localize';
import * as vscode from 'vscode';
import { createLogicAppWorkflow } from './createLogicAppWorkflow';
import { getWorkspaceRoot } from '../../utils/workspace';
import { isCodefulProject } from '../../utils/codeful';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import * as path from 'path';

export const createWorkflow = async (context: IActionContext, uri?: vscode.Uri) => {
  let projectRoot: string | undefined;

  // When invoked from explorer context menu, resolve project from the clicked URI
  if (uri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      projectRoot = await tryGetLogicAppProjectRoot(context, workspaceFolder.uri.fsPath, true);
    }
  }

  // Fallback: scan workspace folders in order (command palette invocation or URI resolution failed)
  if (!projectRoot) {
    const workspaceFolderPath = await getWorkspaceRoot(context);
    projectRoot = workspaceFolderPath ? await tryGetLogicAppProjectRoot(context, workspaceFolderPath, true) : undefined;

    if (!projectRoot && vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        projectRoot = await tryGetLogicAppProjectRoot(context, folder.uri.fsPath, true);
        if (projectRoot) {
          break;
        }
      }
    }
  }

  if (!projectRoot) {
    throw new Error(localize('noLogicAppProject', 'No Logic App project found in the current workspace.'));
  }

  const isCodeful = await isCodefulProject(projectRoot);
  const logicAppName = path.basename(projectRoot.replace(/\\/g, '/'));

  const logicAppType = isCodeful ? ProjectType.codeful : '';

  // Include logicAppName in panel name so each project gets its own panel
  const panelName = localize('createWorkflowForProject', 'Create workflow - {0}', logicAppName);

  await createWorkspaceWebviewCommandHandler({
    panelName,
    panelGroupKey: ext.webViewKey.createWorkflow,
    projectName: ProjectName.createWorkflow,
    createCommand: ExtensionCommand.createWorkflow,
    createHandler: async (context: IActionContext, data: any) => {
      await createLogicAppWorkflow(context, data, projectRoot);
    },
    extraInitializeData: {
      logicAppType,
      logicAppName,
    },
  });
};
