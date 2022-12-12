/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { getContainingWorkspace, selectWorkspaceFolder } from '../../../utils/workspace';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';

export class FolderListStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  /* eslint-disable no-param-reassign */
  public static setProjectPath(context: Partial<IProjectWizardContext>, projectPath: string): void {
    context.projectPath = projectPath;
    context.workspaceFolder = getContainingWorkspace(projectPath);
    context.workspacePath = (context.workspaceFolder && context.workspaceFolder.uri.fsPath) || projectPath;
    if (context.workspaceFolder) {
      context.openBehavior = 'AlreadyOpen';
    }
  }
  /* eslint-enable no-param-reassign */

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('selectNewProjectFolder', 'Select the folder that will contain your workflow project');
    FolderListStep.setProjectPath(context, await selectWorkspaceFolder(context, placeHolder));
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.projectPath;
  }
}
