/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import { OpenBehavior } from '@microsoft/vscode-extension';
import { commands, Uri, workspace } from 'vscode';

/**
 * This class represents a step in the Azure Logic Apps Standard wizard that opens the project folder.
 */
export class OpenFolderStepCodeProject extends AzureWizardExecuteStep<IProjectWizardContext> {
  // Set the priority of the step
  public priority = 250;

  /**
   * Opens the project folder in the specified behavior.
   * @param context The project wizard context.
   */
  public async execute(context: IProjectWizardContext): Promise<void> {
    const openFolders = workspace.workspaceFolders || [];

    // If the open behavior is "Add to workspace" and there are no open folders, change the behavior to "Open in current window"
    if (context.openBehavior === OpenBehavior.addToWorkspace && openFolders.length === 0) {
      context.openBehavior = OpenBehavior.openInCurrentWindow;
    }

    const uri: Uri = Uri.file(context.workspacePath);
    const workspaceNameStr: string = context.workspaceName as string;

    // If the open behavior is "Add to workspace", add the folder to the workspace
    if (context.openBehavior === OpenBehavior.addToWorkspace) {
      workspace.updateWorkspaceFolders(openFolders.length, 0, { uri: uri, name: workspaceNameStr });
    } else {
      // Otherwise, open the folder in a new or existing window
      await commands.executeCommand('vscode.openFolder', uri, context.openBehavior === OpenBehavior.openInNewWindow /* forceNewWindow */);
    }
  }

  /**
   * Determines whether the step should be executed.
   * @param context The project wizard context.
   * @returns True if the step should be executed, false otherwise.
   */
  public shouldExecute(context: IProjectWizardContext): boolean {
    return !!context.openBehavior && context.openBehavior !== OpenBehavior.alreadyOpen && context.openBehavior !== OpenBehavior.dontOpen;
  }
}
