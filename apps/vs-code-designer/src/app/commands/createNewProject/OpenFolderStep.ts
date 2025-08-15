/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardExecuteStepWithActivityOutput } from '@microsoft/vscode-azext-utils';
import { commands, Uri, workspace } from 'vscode';
import { type IProjectWizardContext, OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import { extensionCommand } from '../../../constants';
import { localize } from '../../../localize';

export class OpenFolderStep extends AzureWizardExecuteStepWithActivityOutput<IProjectWizardContext> {
  stepName: string;
  public priority = 250;

  public async execute(context: IProjectWizardContext): Promise<void> {
    const openFolders = workspace.workspaceFolders || [];
    if (context.openBehavior === OpenBehavior.addToWorkspace && openFolders.length === 0) {
      context.openBehavior = OpenBehavior.openInCurrentWindow;
    }

    const uri: Uri = Uri.file(context.workspacePath);
    if (context.openBehavior === OpenBehavior.addToWorkspace) {
      workspace.updateWorkspaceFolders(openFolders.length, 0, { uri: uri });
    } else {
      await commands.executeCommand(
        extensionCommand.vscodeOpenFolder,
        uri,
        context.openBehavior === OpenBehavior.openInNewWindow /* forceNewWindow */
      );
    }
  }

  public shouldExecute(context: IProjectWizardContext): boolean {
    return !!context.openBehavior && context.openBehavior !== OpenBehavior.alreadyOpen && context.openBehavior !== OpenBehavior.dontOpen;
  }

  protected getTreeItemLabel(context: IProjectWizardContext): string {
    return localize('openFolder', 'Open folder "{0}"', context.workspacePath);
  }
  protected getOutputLogSuccess(context: IProjectWizardContext): string {
    return localize('openFolderSuccess', 'Opened folder "{0}"', context.workspacePath);
  }
  protected getOutputLogFail(context: IProjectWizardContext): string {
    return localize('openFolderFail', 'Failed to open folder "{0}"', context.workspacePath);
  }
  protected getOutputLogProgress(context: IProjectWizardContext): string {
    return localize('openingFolder', 'Opening folder "{0}..."', context.workspacePath);
  }
}
