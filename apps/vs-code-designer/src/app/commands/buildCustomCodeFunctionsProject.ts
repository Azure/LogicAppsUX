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
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';

/**
 * Builds a custom code functions project if exists.
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri} node - The URI of the project to build or the corresponding logic app project.
 * @returns {Promise<boolean>} - A promise that resolves to true if a custom code functions project was built, otherwise false.
 */
export async function tryBuildCustomCodeFunctionsProject(context: IActionContext, node: vscode.Uri): Promise<boolean> {
  const workspaceFolderPath = await getWorkspaceRoot(context);
  const nodePath = node?.fsPath || workspaceFolderPath;

  if (isNullOrUndefined(nodePath)) {
    return false;
  }

  context.telemetry.properties.lastStep = 'isCustomCodeFunctionsProject';
  if (await isCustomCodeFunctionsProject(nodePath)) {
    try {
      context.telemetry.properties.lastStep = 'buildCustomCodeProject';
      await buildCustomCodeProject(nodePath);
    } catch (error) {
      context.telemetry.properties.errorMessage = error.message ?? error;
      return false;
    }
    return true;
  }

  context.telemetry.properties.lastStep = 'tryGetLogicAppCustomCodeFunctionsProjects';
  const customCodeProjectPaths = await tryGetLogicAppCustomCodeFunctionsProjects(nodePath);
  if (!customCodeProjectPaths || customCodeProjectPaths.length === 0) {
    return false;
  }

  try {
    context.telemetry.properties.lastStep = 'buildLogicAppCustomCodeProjects';
    await Promise.all(customCodeProjectPaths.map((functionsProjectPath) => buildCustomCodeProject(functionsProjectPath)));
    return true;
  } catch (error) {
    context.telemetry.properties.errorMessage = error.message ?? error;
    ext.outputChannel.appendLog(
      localize(
        'azureLogicAppsStandard.buildCustomCodeFunctionsProjectError',
        'Error building custom code functions projects: {0}',
        error.message ?? error
      )
    );
    return false;
  }
}

/**
 * Builds all custom code functions projects in the workspace.
 * @param {IActionContext} context - The action context.
 * @returns {Promise<void>} - A promise that resolves when the build process is complete.
 */
export async function buildWorkspaceCustomCodeFunctionsProjects(context: IActionContext): Promise<void> {
  context.telemetry.properties.lastStep = 'getWorkspaceRoot';
  const workspaceFolder = await getWorkspaceRoot(context);

  context.telemetry.properties.lastStep = 'tryGetCustomCodeFunctionsProjects';
  const functionsProjectPaths = await tryGetCustomCodeFunctionsProjects(workspaceFolder);
  if (!functionsProjectPaths || functionsProjectPaths.length === 0) {
    context.telemetry.properties.result = 'Succeeded';
    ext.outputChannel.appendLog('No custom code functions projects found.');
    return;
  }

  try {
    context.telemetry.properties.lastStep = 'buildCustomCodeProjects';
    await Promise.all(functionsProjectPaths.map((functionsProjectPath) => buildCustomCodeProject(functionsProjectPath)));
    context.telemetry.properties.result = 'Succeeded';
  } catch (error) {
    context.telemetry.properties.result = 'Failed';
    context.telemetry.properties.errorMessage = error.message;
  }
}

async function buildCustomCodeProject(functionsProjectPath: string): Promise<void> {
  const tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
  const buildTask = tasks.find((task) => {
    const currTaskPath = (task.scope as vscode.WorkspaceFolder)?.uri.fsPath;
    return task.name === 'build' && currTaskPath === functionsProjectPath;
  });

  if (!buildTask) {
    throw new Error(`Build task not found for project at "${functionsProjectPath}".`);
  }

  return new Promise<void>((resolve, reject) => {
    const disposable: vscode.Disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      const isMatchingTask =
        (e.execution.task.scope as vscode.WorkspaceFolder)?.uri.fsPath === functionsProjectPath && e.execution.task.name === buildTask.name;

      if (isMatchingTask) {
        disposable.dispose();

        if (e.exitCode !== 0) {
          const errorMessage = 'Error building custom code functions project at "{0}": {1}';
          const internalErrorMessage = errorMessage
            .replace('{0}', functionsProjectPath)
            .replace('{1}', e.exitCode?.toString() ?? 'unknown');
          const userErrorMessage = localize(
            'azureLogicAppsStandard.buildCustomCodeFunctionsProjectError',
            errorMessage,
            functionsProjectPath,
            e.exitCode
          );
          ext.outputChannel.appendLog(userErrorMessage);
          vscode.window.showWarningMessage(userErrorMessage);
          reject(new Error(internalErrorMessage));
        } else {
          ext.outputChannel.appendLog(`Custom code functions project built successfully at ${functionsProjectPath}.`);
          resolve();
        }
      }
    });

    vscode.tasks.executeTask(buildTask);
  });
}
