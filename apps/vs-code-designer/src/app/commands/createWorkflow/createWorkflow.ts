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
import { getWorkflowsInLocalProject } from '../../utils/codeless/common';
import * as path from 'path';

interface AvailableProject {
  name: string;
  path: string;
  isCodeful: boolean;
  existingWorkflows: string[];
}

export async function createWorkflow(context: IActionContext, uri?: vscode.Uri) {
  ext.outputChannel.appendLog(`[createWorkflow] Started. uri=${uri?.fsPath ?? 'undefined'}`);

  // Collect all available projects
  let availableProjects: AvailableProject[];
  try {
    availableProjects = await collectAvailableProjects(context);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    ext.outputChannel.appendLog(`[createWorkflow] collectAvailableProjects failed: ${message}`);
    throw new Error(localize('failedToCollectProjects', 'Failed to collect Logic App projects: {0}', message));
  }

  ext.outputChannel.appendLog(
    `[createWorkflow] Found ${availableProjects.length} projects: ${availableProjects.map((p) => p.name).join(', ')}`
  );

  // Determine pre-selected project from URI context
  let selectedProject: AvailableProject | undefined;
  if (uri && typeof uri === 'object' && 'fsPath' in uri) {
    try {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
      if (workspaceFolder) {
        const projectRoot = await tryGetLogicAppProjectRoot(context, workspaceFolder.uri.fsPath, true);
        if (projectRoot) {
          selectedProject = availableProjects.find((p) => p.path === projectRoot);
        }
      }
    } catch {
      ext.outputChannel.appendLog(`[createWorkflow] getWorkspaceFolder failed for uri=${uri.fsPath}, continuing without pre-selection`);
    }
  }

  // If no projects found at all, show user-friendly error
  if (availableProjects.length === 0) {
    ext.outputChannel.appendLog('[createWorkflow] No projects found — throwing');
    throw new Error(localize('noLogicAppProject', 'No Logic App project found in the current workspace.'));
  }

  // If only one project and no URI selection, auto-select it
  if (!selectedProject && availableProjects.length === 1) {
    selectedProject = availableProjects[0];
  }

  ext.outputChannel.appendLog(`[createWorkflow] Pre-selected project: ${selectedProject?.name ?? 'none (user must choose from dropdown)'}`);

  const panelName = localize('createWorkflow', 'Create workflow');

  await createWorkspaceWebviewCommandHandler({
    panelName,
    panelGroupKey: ext.webViewKey.createWorkflow,
    projectName: ProjectName.createWorkflow,
    createCommand: ExtensionCommand.createWorkflow,
    createHandler: async (context: IActionContext, data: any) => {
      ext.outputChannel.appendLog(`[createWorkflow] createHandler invoked. logicAppName="${data.logicAppName}"`);
      // Resolve project root from the user's selection in the webview
      const selectedName = data.logicAppName;
      const project = availableProjects.find((p) => p.name === selectedName);
      const projectRoot = project?.path;
      if (!projectRoot) {
        ext.outputChannel.appendLog(`[createWorkflow] Project "${selectedName}" not found in available projects`);
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
      const workflows = await getWorkflowsInLocalProject(projectRoot);
      projects.push({
        name: path.basename(projectRoot.replace(/\\/g, '/')),
        path: projectRoot,
        isCodeful,
        existingWorkflows: Object.keys(workflows || {}),
      });
    }
  }
  return projects;
}
