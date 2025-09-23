/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getContainingWorkspace } from '../../../utils/workspace';
import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs';
import { commands, Uri } from 'vscode';
import { tryReopenInDevContainer } from '../../../utils/devContainer';
import { extensionCommand } from '../../../../constants';

export class OpenFolderStep extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 250;

  /**
   * Determines whether this step should be executed based on the user's input.
   * @param context The context object for the project wizard.
   * @returns A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(context: IProjectWizardContext): boolean {
    return !!context.openBehavior && context.openBehavior !== OpenBehavior.alreadyOpen;
  }

  /**
   * Executes the step to open the folder in Visual Studio Code.
   * @param context The context object for the project wizard.
   * @returns A Promise that resolves to void.
   */
  public async execute(context: IProjectWizardContext): Promise<void> {
    // Resolve the workspace URI (.code-workspace file if present, else the folder path)
    const workspaceFilePath = context.workspaceFilePath;
    context.workspaceFolder = getContainingWorkspace(workspaceFilePath);
    const workspaceUri: Uri = fs.existsSync(workspaceFilePath) ? Uri.file(workspaceFilePath) : Uri.file(context.workspacePath);

    // Attempt to open directly in a dev container. Prefer devcontainers.openFolder if available.
    // Fallback: open locally, then trigger reopen.
    try {
      const succeeded = await commands.executeCommand('remote-containers.openFolder', workspaceUri);
      if (!succeeded) {
        throw new Error('devcontainers.openFolder returned falsy result');
      }
    } catch (_err) {
      // Fallback path: open locally then request a reopen.
      await commands.executeCommand(extensionCommand.vscodeOpenFolder, workspaceUri, false);
      await tryReopenInDevContainer(context as any);
    }
  }
}
