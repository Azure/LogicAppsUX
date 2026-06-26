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
import { isCodefulProject } from '../../utils/codeful';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import * as path from 'path';

interface AvailableProject {
  name: string;
  path: string;
  isCodeful: boolean;
}

/**
 * Collects all Logic App projects across workspace folders.
 */
async function collectAvailableProjects(context: IActionContext): Promise<AvailableProject[]> {
  const projects: AvailableProject[] = [];
  if (!vscode.workspace.workspaceFolders) {
    return projects;
  }

  for (const folder of vscode.workspace.workspaceFolders) {
    const projectRoot = await tryGetLogicAppProjectRoot(context, folder.uri.fsPath, true);
    if (projectRoot) {
      const isCodeful = await isCodefulProject(projectRoot);
      projects.push({
        name: path.basename(projectRoot.replace(/\\/g, '/')),
        path: projectRoot,
        isCodeful,
      });
    }
  }
  return projects;
}

export const createWorkflow = async (context: IActionContext, uri?: vscode.Uri) => {
  // Collect all available projects
  const availableProjects = await collectAvailableProjects(context);

  // Determine pre-selected project from URI context
  let selectedProject: AvailableProject | undefined;
  if (uri) {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
    if (workspaceFolder) {
      const projectRoot = await tryGetLogicAppProjectRoot(context, workspaceFolder.uri.fsPath, true);
      if (projectRoot) {
        selectedProject = availableProjects.find((p) => p.path === projectRoot);
      }
    }
  }

  // If no projects found at all, throw
  if (availableProjects.length === 0) {
    throw new Error(localize('noLogicAppProject', 'No Logic App project found in the current workspace.'));
  }

  // If only one project and no URI selection, auto-select it
  if (!selectedProject && availableProjects.length === 1) {
    selectedProject = availableProjects[0];
  }

  const panelName = localize('createWorkflow', 'Create workflow');

  await createWorkspaceWebviewCommandHandler({
    panelName,
    panelGroupKey: ext.webViewKey.createWorkflow,
    projectName: ProjectName.createWorkflow,
    createCommand: ExtensionCommand.createWorkflow,
    createHandler: async (context: IActionContext, data: any) => {
      // Resolve project root from the user's selection in the webview
      const selectedName = data.logicAppName;
      const project = availableProjects.find((p) => p.name === selectedName);
      const projectRoot = project?.path;
      if (!projectRoot) {
        throw new Error(localize('noProjectSelected', 'No project selected. Please select a project and try again.'));
      }
      await createLogicAppWorkflow(context, data, projectRoot);
    },
    extraInitializeData: {
      logicAppType: selectedProject?.isCodeful ? ProjectType.codeful : '',
      logicAppName: selectedProject?.name || '',
      availableProjects,
    },
  });
};
