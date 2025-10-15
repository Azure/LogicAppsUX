/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName } from '@microsoft/vscode-extension-logic-apps';
import { convertToWorkspace } from '../convertToWorkspace';
import { localize } from '../../../localize';
import { ext } from '../../../extensionVariables';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';
import * as vscode from 'vscode';
import path from 'path';
import { createLogicAppProject } from '../createNewCodeProject/CodeProjectBase/CreateLogicAppProjects';
import { getLogicAppWithoutCustomCode } from '../../utils/workspace';

export async function createNewProjectFromCommand(context: IActionContext): Promise<void> {
  // Determine if in workspace, if not in workspace but there is a logic app project found,
  // prompt to see if they want to move the project over to a logic app workspace
  let workspaceRootFolder = '';

  if (vscode.workspace.workspaceFile) {
    // Get the directory containing the .code-workspace file
    workspaceRootFolder = path.dirname(vscode.workspace.workspaceFile.fsPath);
  } else {
    // Fall back to the newly created workspace folder if not in a workspace
    await convertToWorkspace(context);
    return;
  }

  // Get workspace data for the webview
  const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.workspace.workspaceFile);
  const workspaceFileJson = JSON.parse(workspaceFileContent.toString());
  const logicAppsWithoutCustomCode = await getLogicAppWithoutCustomCode(context);

  await createWorkspaceWebviewCommandHandler({
    panelName: localize('createLogicAppProject', 'Create Project'),
    panelGroupKey: ext.webViewKey.createLogicApp,
    projectName: ProjectName.createLogicApp,
    createCommand: ExtensionCommand.createLogicApp,
    createHandler: async (activateContext: IActionContext, data: any) => {
      await createLogicAppProject(activateContext, data, workspaceRootFolder);
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
      logicAppsWithoutCustomCode,
    },
  });
}
