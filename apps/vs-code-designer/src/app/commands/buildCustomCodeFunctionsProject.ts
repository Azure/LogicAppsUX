/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { isCustomCodeFunctionsProject, tryGetLogicAppCustomCodeFunctionsProjects } from '../utils/customCodeUtils';
import * as vscode from 'vscode';
import { isNullOrUndefined } from '@microsoft/logic-apps-shared';
import { isPathEqual, isSubpath } from '../utils/fs';

/**
 * Builds a custom code functions project if exists.
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri} [node] - The URI of the project to build or the corresponding logic app project.
 * @returns {Promise<boolean>} - A promise that resolves to true if a custom code functions project was built, otherwise false.
 */
export async function tryBuildCustomCodeFunctionsProject(context: IActionContext, node?: vscode.Uri): Promise<boolean> {
  const nodePath = node?.fsPath;
  if (isNullOrUndefined(nodePath)) {
    return false;
  }

  return await tryBuildCustomCodeFunctionsProjectInternal(context, nodePath);
}

export async function tryBuildCustomCodeFunctionsProjectInternal(context: IActionContext, projectPath: string): Promise<boolean> {
  context.telemetry.properties.lastStep = 'isCustomCodeFunctionsProject';
  if (await isCustomCodeFunctionsProject(projectPath)) {
    try {
      context.telemetry.properties.lastStep = 'buildCustomCodeProject';
      await buildCustomCodeProject(projectPath);
    } catch (error) {
      context.telemetry.properties.result = 'Failed';
      context.telemetry.properties.errorMessage = error.message ?? error;
      return false;
    }
    return true;
  }

  context.telemetry.properties.lastStep = 'tryGetLogicAppCustomCodeFunctionsProjects';
  const customCodeProjectPaths = await tryGetLogicAppCustomCodeFunctionsProjects(projectPath);
  if (!customCodeProjectPaths || customCodeProjectPaths.length === 0) {
    return false;
  }

  try {
    context.telemetry.properties.lastStep = 'buildLogicAppCustomCodeProjects';
    await Promise.all(customCodeProjectPaths.map((functionsProjectPath) => buildCustomCodeProject(functionsProjectPath)));
    return true;
  } catch (error) {
    context.telemetry.properties.result = 'Failed';
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

async function buildCustomCodeProject(functionsProjectPath: string): Promise<void> {
  const tasks: vscode.Task[] = await vscode.tasks.fetchTasks();
  const buildTask = tasks.find((task) => {
    const currTaskPath = (task.scope as vscode.WorkspaceFolder)?.uri.fsPath;
    // TODO(aeldridge): For nested projects, this will select any matching build task in the workspace folder. Need to scope tasks to individual projects.
    return task.name === 'build' && !!currTaskPath && (isPathEqual(currTaskPath, functionsProjectPath) || isSubpath(currTaskPath, functionsProjectPath));
  });

  if (!buildTask) {
    throw new Error(`Build task not found for project at "${functionsProjectPath}".`);
  }

  return new Promise<void>((resolve, reject) => {
    const disposable: vscode.Disposable = vscode.tasks.onDidEndTaskProcess((e) => {
      const taskPath = (e.execution.task.scope as vscode.WorkspaceFolder)?.uri.fsPath;
      const isMatchingTask =
        !!taskPath &&
        (isPathEqual(taskPath, functionsProjectPath) || isSubpath(taskPath, functionsProjectPath)) &&
        e.execution.task.name === buildTask.name;

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
