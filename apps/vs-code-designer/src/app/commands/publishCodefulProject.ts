/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { getWorkspaceRoot } from '../utils/workspace';
import * as vscode from 'vscode';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { isCodefulProject } from '../utils/codeful';

/**
 * Builds a custom code functions project.
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri} node - The URI of the project to build or the corresponding logic app project.
 * @returns {Promise<void>} - A promise that resolves when the build process is complete.
 */
export async function publishCodefulProject(context: IActionContext, node: vscode.Uri): Promise<void> {
  const workspaceFolderPath = await getWorkspaceRoot(context);
  const nodePath = node?.fsPath || workspaceFolderPath;

  if (isNullOrUndefined(nodePath)) {
    const errorMessage = 'No project path found to publish custom code functions project.';
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = errorMessage;
    ext.outputChannel.appendLog(localize('noProjectPathPublishCodeful', errorMessage));
    return;
  }

  const isCodeful = await isCodefulProject(nodePath);
  if (!isCodeful) {
    const message = `Skipping publish: Path "${nodePath}" is not a codeful project.`;
    ext.outputChannel.appendLog(message);
    return;
  }

  try {
    context.telemetry.properties.lastStep = 'publishCodefulProject';
    await runPublishCommand(nodePath);
    context.telemetry.properties.result = 'Succeeded';
  } catch (error) {
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = (error as Error).message ?? String(error);
    throw error;
  }
}

/**
 * Executes the publish task for a Logic Apps codeful project at the specified path.
 * This function locates and runs the 'publish' task associated with the given project path,
 * then monitors the task execution to determine success or failure. It logs the result
 * to the output channel and displays messages to the user accordingly.
 * @param projectPath - The file system path to the Logic Apps project to be published.
 * @returns A Promise that resolves when the publish task completes successfully,
 *          or rejects if the task is not found or exits with a non-zero code.
 * @throws {Error} If no publish task is found for the specified project path.
 * @throws {Error} If the publish task exits with a non-zero exit code.
 */
async function runPublishCommand(projectPath: string): Promise<void> {
  const tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
  const publishTask = tasks.find((task) => {
    const currTaskPath = (task.scope as vscode.WorkspaceFolder)?.uri.fsPath;
    return task.name === 'publish' && currTaskPath === projectPath;
  });

  if (!publishTask) {
    throw new Error(`Publish task not found for project at "${projectPath}".`);
  }

  return new Promise<void>((resolve, reject) => {
    const disposable: vscode.Disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      const isMatchingTask =
        (e.execution.task.scope as vscode.WorkspaceFolder)?.uri.fsPath === projectPath && e.execution.task.name === publishTask.name;

      if (isMatchingTask) {
        disposable.dispose();

        if (e.exitCode !== 0) {
          const errorMessage = 'Error publishing codeful project at "{0}": {1}';
          const internalErrorMessage = errorMessage.replace('{0}', projectPath).replace('{1}', e.exitCode?.toString() ?? 'unknown');
          const userErrorMessage = localize('azureLogicAppsStandard.publishCodefulProjectError', errorMessage, projectPath, e.exitCode);
          ext.outputChannel.appendLog(userErrorMessage);
          vscode.window.showWarningMessage(userErrorMessage);
          reject(new Error(internalErrorMessage));
        } else {
          ext.outputChannel.appendLog(`Codeful project published successfully at ${projectPath}.`);
          resolve();
        }
      }
    });

    vscode.tasks.executeTask(publishTask);
  });
}
