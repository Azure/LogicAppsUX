/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { getContainingWorkspace } from '../../../utils/workspace';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import * as fs from 'fs-extra';
import { OpenBehavior } from '@microsoft/vscode-extension-logic-apps';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';
import { workspaceNameValidation } from '../../../../constants';

export class SetWorkspaceName extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.workspaceName = await context.ui.showInputBox({
      placeHolder: localize('setWorkspaceName', 'Workspace name'),
      prompt: localize('workspaceNamePrompt', 'Provide a workspace name'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateWorkspaceName(input),
    });

    //save uri variable for open project folder command
    context.workspaceCustomFilePath = path.join(context.projectPath, context.workspaceName);
    await fs.ensureDir(context.workspacePath);
    context.workspacePath = context.workspaceCustomFilePath;
    context.workspaceFolder = getContainingWorkspace(context.workspacePath);
    const workspaceFilePath = path.join(context.workspacePath, `${context.workspaceName}.code-workspace`);
    context.workspaceCustomFilePath = workspaceFilePath;

    if (context.workspaceFolder) {
      context.openBehavior = OpenBehavior.alreadyOpen;
    }
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private async validateWorkspaceName(name: string | undefined): Promise<string | undefined> {
    if (!name) {
      return localize('emptyWorkspaceName', 'The workspace name cannot be empty.');
    }
    if (!workspaceNameValidation.test(name)) {
      return localize(
        'workspaceNameInvalidMessage',
        'Workspace name must start with a letter and can only contain letters, digits, "_" and "-".'
      );
    }
    return undefined;
  }
}
