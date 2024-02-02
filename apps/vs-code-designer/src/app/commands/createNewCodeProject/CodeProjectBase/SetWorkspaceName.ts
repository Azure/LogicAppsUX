/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { getContainingWorkspace } from '../../../utils/workspace';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import { OpenBehavior } from '@microsoft/vscode-extension';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';
import * as fs from 'fs-extra';
import * as path from 'path';

export class setWorkspaceName extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.workspaceName = await context.ui.showInputBox({
      placeHolder: localize('setWorkspaceName', 'Workspace name'),
      prompt: localize('workspaceNamePrompt', 'Provide a workspace name'),
    });
    //save uri variable for open project folder command
    context.workspaceCustomFilePath = path.join(context.projectPath, context.workspaceName);
    await fs.ensureDir(context.workspacePath);
    context.workspacePath = context.workspaceCustomFilePath;
    context.workspaceFolder = getContainingWorkspace(context.workspacePath);

    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
  }

  public shouldPrompt(): boolean {
    return true;
  }
}
