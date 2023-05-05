/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { OpenBehavior } from '@microsoft/vscode-extension';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';

export class setWorkspaceName extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public static setProjectName(context: Partial<IProjectWizardContext>, projectName: string): void {
    context.workspaceName = projectName;
    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
  }

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('setWorkspaceName', 'Select workspace Name');
    setWorkspaceName.setProjectName(context, placeHolder);
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.projectName;
  }
}
