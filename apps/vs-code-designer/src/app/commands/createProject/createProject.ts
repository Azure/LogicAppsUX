/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { createWorkspace } from '../createWorkspace/createWorkspace';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';
import * as vscode from 'vscode';
import path from 'path';
import { addProjectsToWorkspace } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';

export async function createProject(_context: IActionContext): Promise<void> {
  const workspaceFile = vscode.workspace.workspaceFile;
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceFile && !folder) {
    await createWorkspace(_context);
    return;
  }
  if ((workspaceFile && workspaceFile.scheme !== 'file') || (!workspaceFile && folder.scheme !== 'file')) {
    throw new Error('Add new project requires a saved local workspace or an open local folder.');
  }
  const workspaceRootFolder = workspaceFile ? path.dirname(workspaceFile.fsPath) : folder.fsPath;

  await createWorkspaceWebviewCommandHandler({
    panelName: localize('addNewProject', 'Add new project'),
    panelGroupKey: ext.webViewKey.createLogicApp,
    projectName: ProjectName.createWorkspace,
    createCommand: ExtensionCommand.createWorkspace,
    createHandler: async (data: any) => {
      await callWithTelemetryAndErrorHandling(ExtensionCommand.createWorkspace, async (actionContext: IActionContext) => {
        actionContext.errorHandling.rethrow = true;
        await addProjectsToWorkspace(actionContext, data, workspaceRootFolder, workspaceFile);
      });
    },
    extraInitializeData: {
      currentWorkspace: true,
      workspaceRootFolder,
      workspaceName: path.basename(workspaceRootFolder),
    },
  });
}
