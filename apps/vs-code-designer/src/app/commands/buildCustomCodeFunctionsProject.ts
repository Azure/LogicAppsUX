/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { getWorkspaceRoot } from '../utils/workspace';
import {
  isCustomCodeFunctionsProject,
  tryGetCustomCodeFunctionsProjects,
  tryGetLogicAppCustomCodeFunctionsProjects,
} from '../utils/customCodeUtils';
import * as vscode from 'vscode';

/**
 * Builds a custom code functions project.
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri} node - The URI of the project to build or the corresponding logic app project.
 * @returns {Promise<void>} - A promise that resolves when the build process is complete.
 */
export async function buildCustomCodeFunctionsProject(context: IActionContext, node: vscode.Uri): Promise<void> {
  if (await isCustomCodeFunctionsProject(node.fsPath)) {
    await buildCustomCodeProject(node.fsPath);
    return;
  }

  const customCodeProjectPaths = await tryGetLogicAppCustomCodeFunctionsProjects(node.fsPath);
  if (!customCodeProjectPaths || customCodeProjectPaths.length === 0) {
    ext.outputChannel.appendLog(`No peer custom code functions projects found for target folder ${node.fsPath}.`);
    return;
  }

  await Promise.all(customCodeProjectPaths.map((functionsProjectPath) => buildCustomCodeProject(functionsProjectPath)));
}

/**
 * Builds all custom code functions projects in the workspace.
 * @param {IActionContext} context - The action context.
 * @returns {Promise<void>} - A promise that resolves when the build process is complete.
 */
export async function buildWorkspaceCustomCodeFunctionsProjects(context: IActionContext): Promise<void> {
  const workspaceFolder = await getWorkspaceRoot(context);
  const functionsProjectPaths = await tryGetCustomCodeFunctionsProjects(workspaceFolder);
  if (!functionsProjectPaths || functionsProjectPaths.length === 0) {
    ext.outputChannel.appendLog('No custom code functions projects found.');
    return;
  }

  await Promise.all(functionsProjectPaths.map((functionsProjectPath) => buildCustomCodeProject(functionsProjectPath)));
}

async function buildCustomCodeProject(functionsProjectPath: string): Promise<void> {
  const tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
  const buildTask = tasks.find((task) => {
    const currTaskPath = (task.scope as vscode.WorkspaceFolder)?.uri.fsPath;
    return task.name === 'build' && currTaskPath === functionsProjectPath;
  });
  await vscode.tasks.executeTask(buildTask);

  return new Promise<void>((resolve) => {
    const disposable: vscode.Disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      if ((e.execution.task.scope as vscode.WorkspaceFolder).uri.fsPath === functionsProjectPath && e.execution.task === buildTask) {
        if (e.exitCode !== 0) {
          const errorMessage = `Error building custom code functions project at ${functionsProjectPath}: ${e.exitCode}`;
          ext.outputChannel.appendLog(errorMessage);
          vscode.window.showWarningMessage(localize('azureLogicAppsStandard.buildCustomCodeFunctionsProjectError', errorMessage));
        } else {
          ext.outputChannel.appendLog(`Custom code functions project built successfully at ${functionsProjectPath}.`);
        }
        disposable.dispose();
        resolve();
      }
    });
  });
}
