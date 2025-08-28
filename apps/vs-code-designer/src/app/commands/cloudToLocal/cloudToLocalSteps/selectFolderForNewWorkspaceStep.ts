/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep, type IActionContext, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { OpenBehavior, ProjectType, type IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import type * as vscode from 'vscode';
import { getContainingWorkspace } from '../../../utils/workspace';

export class SelectFolderForNewWorkspaceStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public static async setProjectPath(context: IActionContext, placeHolder: string): Promise<string> {
    const folderPicks: IAzureQuickPickItem<string | undefined>[] = [];
    const options: vscode.OpenDialogOptions = {
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      defaultUri: undefined,
      openLabel: localize('select', 'Select'),
    };

    folderPicks.push({ label: localize('browse', '$(file-directory) Browse...'), description: '', data: undefined });
    const packageFile: IAzureQuickPickItem<string | undefined> | undefined = await context.ui.showQuickPick(folderPicks, { placeHolder });

    return packageFile && packageFile.data ? packageFile.data : (await context.ui.showOpenDialog(options))[0].fsPath;
  }

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('selectNewProjectFolder', 'Select the folder to store your logic app workspace');
    const projectPath = await SelectFolderForNewWorkspaceStep.setProjectPath(context, placeHolder);
    context.projectPath = projectPath;
    context.projectType = ProjectType.logicApp;
    context.workspaceFolder = getContainingWorkspace(projectPath);
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || projectPath;
    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.projectPath;
  }
}
