/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { OpenBehavior } from '@microsoft/vscode-extension';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import * as path from 'path';

export class setWorkspaceName extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.workspaceName = await context.ui.showInputBox({
      placeHolder: localize('setWorkspaceName', 'Workspace name'),
      prompt: localize('workspaceNamePrompt', 'Provide a workspace name'),
    });

    context.workspacePath = path.join(context.projectPath, context.workspaceName);

    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
  }

  public shouldPrompt(): boolean {
    return true;
  }
}
