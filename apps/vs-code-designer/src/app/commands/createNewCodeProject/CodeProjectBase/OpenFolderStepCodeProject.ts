/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import * as fs from 'fs';
import * as path from 'path';
import { commands, Uri, workspace } from 'vscode';

/**
 * A class that extends AzureWizardExecuteStep and is responsible for opening a folder in Visual Studio Code.
 */
export class OpenFolderStepCodeProject extends AzureWizardExecuteStep<IProjectWizardContext> {
  public priority = 250;

  /**
   * Executes the step to open the folder in Visual Studio Code.
   * @param context The context object for the project wizard.
   * @returns A Promise that resolves to void.
   */
  public async execute(context: IProjectWizardContext): Promise<void> {
    const openFolders = workspace.workspaceFolders || [];
    let uri: Uri;
    const workspaceName = context.workspaceName;

    // Check if .code-workspace file exists in project path
    const workspaceFilePath = path.join(context.workspacePath, `${workspaceName}.code-workspace`);
    if (fs.existsSync(workspaceFilePath)) {
      uri = Uri.file(workspaceFilePath);
    } else {
      uri = Uri.file(context.workspacePath);
    }

    // Check if user has selected to add folder to workspace and update workspace accordingly
    if (context.openBehavior === OpenBehavior.addToWorkspace && openFolders.length === 0) {
      context.openBehavior = OpenBehavior.openInCurrentWindow;
    }

    if (context.openBehavior === OpenBehavior.addToWorkspace) {
      workspace.updateWorkspaceFolders(openFolders.length, 0, { uri: uri });
    } else {
      // Open folder using executeCommand method of commands object with vscode.openFolder command
      await commands.executeCommand('vscode.openFolder', uri, context.openBehavior === OpenBehavior.openInNewWindow /* forceNewWindow */);
    }
  }

  /**
   * Determines whether this step should be executed based on the user's input.
   * @param context The context object for the project wizard.
   * @returns A boolean value indicating whether this step should be executed.
   */
  public shouldExecute(context: IProjectWizardContext): boolean {
    return !!context.openBehavior && context.openBehavior !== OpenBehavior.alreadyOpen && context.openBehavior !== OpenBehavior.dontOpen;
  }
}
