import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { exec } from 'child_process';
import { ext } from '../../../../extensionVariables';
import { window } from 'vscode';
import { getWorkspaceFolder } from '../../../utils/workspace';
import { getWorkspaceSetting } from '../../../utils/vsCodeConfig/settings';

export async function buildCodeProject(context: IActionContext): Promise<void> {
  const workspaceFolder = await getWorkspaceFolder(context, undefined, true);
  const functionProjectPath: string | undefined = getWorkspaceSetting('functionFolderPath', workspaceFolder, 'azureFunctions');
  if (!functionProjectPath) {
    return;
  }

  return new Promise((resolve, reject) => {
    exec('dotnet restore && dotnet build', { cwd: functionProjectPath }, (error: Error, stdout: string, stderr: string) => {
      const err = error || stderr;
      if (err) {
        const errorMessage = `Error building custom code functions project: ${err}`;
        ext.outputChannel.appendLog(errorMessage);
        window.showErrorMessage(errorMessage);
        reject(err);
      } else {
        const successMessage = 'Custom code functions project built successfully.';
        ext.outputChannel.appendLog(successMessage);
        window.showInformationMessage(successMessage);
        resolve();
      }
    });
  });
}
