import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { exec } from 'child_process';
import { ext } from '../../../../extensionVariables';
import { window } from 'vscode';
import { getWorkspaceRoot } from '../../../utils/workspace';
import { tryGetCustomCodeFunctionsProjects } from '../../../utils/verifyIsCodeProject';

/**
 * Builds all custom code functions projects in the workspace.
 * @param {IActionContext} context - The action context.
 * @returns {Promise<void>} - A promise that resolves when the build process is complete.
 */
export async function buildCodeProjects(context: IActionContext): Promise<void> {
  const workspaceFolder = await getWorkspaceRoot(context);
  const functionsProjectPaths = await tryGetCustomCodeFunctionsProjects(workspaceFolder);
  if (!functionsProjectPaths || functionsProjectPaths.length === 0) {
    ext.outputChannel.appendLog('No custom code functions projects found.');
    return;
  }

  await Promise.all(functionsProjectPaths.map((functionsProjectPath) => buildCodeProject(functionsProjectPath)));
}

async function buildCodeProject(functionsProjectPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
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
        window.showInformationMessage(successMessage);
        resolve();
      }
    });
  });
}
