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

export const createWorkflow = async (context: IActionContext) => {
  const workspaceFolderPath = await getWorkspaceRoot(context);
  let projectRoot = workspaceFolderPath ? await tryGetLogicAppProjectRoot(context, workspaceFolderPath, true) : undefined;

  if (!projectRoot && vscode.workspace.workspaceFolders) {
    for (const folder of vscode.workspace.workspaceFolders) {
      projectRoot = await tryGetLogicAppProjectRoot(context, folder.uri.fsPath, true);
      if (projectRoot) {
        break;
      }
    }
  }

  if (!projectRoot) {
    throw new Error(localize('noLogicAppProject', 'No Logic App project found in the current workspace.'));
  }

  const isCodeful = await isCodefulProject(projectRoot);
  const logicAppName = path.basename(projectRoot);

  const logicAppType = isCodeful ? ProjectType.codeful : '';

  await createWorkspaceWebviewCommandHandler({
    panelName: localize('createWorkflow', 'Create workflow'),
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
