/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../extensionVariables';
import { callWithTelemetryAndErrorHandling, type IActionContext } from '@microsoft/vscode-azext-utils';
import { ExtensionCommand, ProjectName, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { createWorkspaceWebviewCommandHandler } from '../shared/workspaceWebviewCommandHandler';
import { localize } from '../../../localize';
import type * as vscode from 'vscode';
import { createLogicAppWorkflow } from './createLogicAppWorkflow';
import { isCodefulLogicApp } from '../../utils/codeful';
import { getWorkflowsInLocalProject } from '../../utils/codeless/common';
import * as path from 'path';
import { isPathEqual } from '../../utils/fs';
import { getLogicAppRoots, isLogicApp, selectLogicAppRoot } from '../../utils/workspace';

export async function createWorkflow(context: IActionContext, node?: vscode.Uri) {
  ext.outputChannel.appendLog(`[createWorkflow] Started. uri=${node?.fsPath ?? 'undefined'}`);
  const projectPath = node && (await isLogicApp(node.fsPath)) ? node.fsPath : await selectLogicAppRoot(context);
  if (!projectPath) {
    throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root.'));
  }

  const projectPaths = await getLogicAppRoots();
  const availableProjectPromises = projectPaths.map(async p => {
    return {
      name: path.basename(p.replace(/\\/g, '/')),
      path: p,
      isCodeful: await isCodefulLogicApp(p),
      existingWorkflows: Object.keys(await getWorkflowsInLocalProject(p) || {}),
    }
  });
  const availableProjects = await Promise.all(availableProjectPromises);

  if (availableProjects.length === 0) {
    ext.outputChannel.appendLog('[createWorkflow] No projects found — throwing');
    throw new Error(localize('noLogicAppProject', 'No Logic App project found in the current workspace.'));
  }

  ext.outputChannel.appendLog(
    `[createWorkflow] Found ${availableProjects.length} projects: ${availableProjects.map((p) => p.name).join(', ')}`
  );

  const selectedProject = availableProjects.find((p) => isPathEqual(p.path, projectPath));
  if (!selectedProject) {
    throw new Error(localize('projectNotFound', 'Selected project not found in the workspace.'));
  }

  ext.outputChannel.appendLog(`[createWorkflow] Selected project: ${selectedProject.name}`);

  const panelName = localize('createWorkflow', 'Create workflow');

  await createWorkspaceWebviewCommandHandler({
    panelName,
    panelGroupKey: ext.webViewKey.createWorkflow,
    projectName: ProjectName.createWorkflow,
    createCommand: ExtensionCommand.createWorkflow,
    createHandler: async (data: any) => {
      await callWithTelemetryAndErrorHandling(ExtensionCommand.createWorkflow, async (actionContext: IActionContext) => {
        ext.outputChannel.appendLog(`[createWorkflow] createHandler invoked. logicAppName="${data.logicAppName}"`);
        // Resolve project root from the user's selection in the webview
        const selectedName = data.logicAppName;
        const project = availableProjects.find((p) => p.name === selectedName);
        const projectRoot = project?.path;
        if (!projectRoot) {
          ext.outputChannel.appendLog(`[createWorkflow] Project "${selectedName}" not found in available projects`);
          throw new Error(localize('noProjectSelected', 'No project selected. Please select a project and try again.'));
        }
        await createLogicAppWorkflow(actionContext, data, projectRoot);
      });
    },
    extraInitializeData: {
      logicAppType: selectedProject?.isCodeful ? ProjectType.codeful : '',
      logicAppName: selectedProject?.name || '',
      availableProjects,
    },
  });
}
