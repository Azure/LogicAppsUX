/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { exec } from 'child_process';
import { ext } from '../../extensionVariables';
import { window } from 'vscode';
import { getWorkspaceRoot } from '../utils/workspace';
import {
  isCustomCodeFunctionsProject,
  tryGetCustomCodeFunctionsProjects,
  tryGetPeerCustomCodeFunctionsProjects,
} from '../utils/verifyIsCodeProject';
import type { Uri } from 'vscode';

/**
 * Builds a custom code functions project.
 * @param {IActionContext} context - The action context.
 * @param {Uri} node - The URI of the project to build or the corresponding logic app project.
 * @returns {Promise<void>} - A promise that resolves when the build process is complete.
 */
export async function buildCodeFunctionsProject(context: IActionContext, node: Uri): Promise<void> {
  if (await isCustomCodeFunctionsProject(node.fsPath)) {
    await buildCodeProject(node.fsPath, true);
    return;
  }

  const peerCustomCodeProjectPaths = await tryGetPeerCustomCodeFunctionsProjects(node.fsPath);
  if (!peerCustomCodeProjectPaths || peerCustomCodeProjectPaths.length === 0) {
    ext.outputChannel.appendLog(`No peer custom code functions projects found for target folder ${node.fsPath}.`);
    return;
  }

  await Promise.all(peerCustomCodeProjectPaths.map((functionsProjectPath) => buildCodeProject(functionsProjectPath, true)));
}

/**
 * Builds all custom code functions projects in the workspace.
 * @param {IActionContext} context - The action context.
 * @returns {Promise<void>} - A promise that resolves when the build process is complete.
 */
export async function buildWorkspaceCodeFunctionsProjects(context: IActionContext): Promise<void> {
  const workspaceFolder = await getWorkspaceRoot(context);
  const functionsProjectPaths = await tryGetCustomCodeFunctionsProjects(workspaceFolder);
  if (!functionsProjectPaths || functionsProjectPaths.length === 0) {
    ext.outputChannel.appendLog('No custom code functions projects found.');
    return;
  }

  await Promise.all(functionsProjectPaths.map((functionsProjectPath) => buildCodeProject(functionsProjectPath, false)));
}

async function buildCodeProject(functionsProjectPath: string, showWindowInformationMessage: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    ext.outputChannel.appendLog(`Building custom code functions project at ${functionsProjectPath}...`);
    exec('dotnet restore && dotnet build', { cwd: functionsProjectPath }, (error: Error, stdout: string, stderr: string) => {
      const err = error || stderr;
      if (err) {
        const errorMessage = `Error building custom code functions project at ${functionsProjectPath}: ${err}`;
        ext.outputChannel.appendLog(errorMessage);
        window.showErrorMessage(errorMessage);
        reject(err);
      } else {
        const successMessage = `Custom code functions project built successfully at ${functionsProjectPath}.`;
        ext.outputChannel.appendLog(successMessage);
        if (showWindowInformationMessage) {
          window.showInformationMessage(successMessage);
        }
        resolve();
      }
    });
  });
}
