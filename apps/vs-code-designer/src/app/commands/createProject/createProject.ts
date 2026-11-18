/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, type IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { createWorkspace, type ProjectCreationMode, projectCreationTitles } from '../createWorkspace/createWorkspace';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';
import * as vscode from 'vscode';
import path from 'path';
import { addProjectsToWorkspace } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppWorkspace';
import { getWorkspaceLogicAppRoots } from '../../utils/workspace';
import { getEligibleLogicAppFoldersForCustomCode } from '../../utils/customCodeUtils';

export async function createProject(_context: IActionContext, projectCreationMode?: ProjectCreationMode): Promise<void> {
  const workspaceFile = vscode.workspace.workspaceFile;
  const folder = vscode.workspace.workspaceFolders?.[0]?.uri;
  if (!workspaceFile && !folder) {
    await createWorkspace(_context, projectCreationMode);
    return;
  }
  if ((workspaceFile && workspaceFile.scheme !== 'file') || (!workspaceFile && folder.scheme !== 'file')) {
    throw new Error('Add new project requires a saved local workspace or an open local folder.');
  }
  const workspaceRootFolder = workspaceFile ? path.dirname(workspaceFile.fsPath) : folder.fsPath;
  const hasExistingLogicApp = projectCreationMode === 'customCode' && (await getWorkspaceLogicAppRoots()).length > 0;

  await createWorkspaceWebviewCommandHandler({
    panelName: projectCreationMode ? projectCreationTitles[projectCreationMode] : localize('addNewProject', 'Add new project'),
    panelGroupKey: ext.webViewKey.createLogicApp,
    projectName: ProjectName.createWorkspace,
    createCommand: ExtensionCommand.createWorkspace,
    createHandler: async (data: any) => {
      await callWithTelemetryAndErrorHandling(ExtensionCommand.createWorkspace, async (actionContext: IActionContext) => {
        actionContext.errorHandling.rethrow = true;
        let existingLogicAppPath: string | undefined;
        if (projectCreationMode === 'customCode' && !data.selectedProjects?.logicApp) {
          const eligiblePaths = [...new Set(await getEligibleLogicAppFoldersForCustomCode())];
          if (!eligiblePaths.length) {
            throw new Error(
              localize(
                'noEligibleCustomCodeLogicApp',
                'No existing Logic App can accept a new custom code project. Reopen the project wizard to create a Logic App, or use an existing custom code project.'
              )
            );
          }
          if (eligiblePaths.length === 1) {
            existingLogicAppPath = eligiblePaths[0];
          } else {
            const target = await vscode.window.showQuickPick(
              eligiblePaths.map((projectPath) => ({ label: path.basename(projectPath), description: projectPath })),
              { placeHolder: localize('selectCustomCodeLogicApp', 'Select the Logic App for this custom code project') }
            );
            if (!target) {
              throw new UserCancelledError();
            }
            existingLogicAppPath = target.description;
          }
        }
        await addProjectsToWorkspace(actionContext, data, workspaceRootFolder, workspaceFile, existingLogicAppPath);
      });
    },
    extraInitializeData: {
      currentWorkspace: true,
      workspaceRootFolder,
      workspaceName: path.basename(workspaceRootFolder),
      projectCreationMode,
      hasExistingLogicApp,
    },
  });
}
