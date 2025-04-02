/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { logicAppNameValidation } from '../../../../constants';

export class LogicAppNameStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.logicAppName = await context.ui.showInputBox({
      placeHolder: localize('logicAppNamePlaceHolder', 'Logic App name'),
      prompt: localize('logicAppNamePrompt', 'Enter a name for your Logic App project'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateLogicAppName(input, context),
    });

    ext.outputChannel.appendLog(localize('logicAppNameSet', `Logic App project name set to ${context.logicAppName}`));
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.projectType !== undefined;
  }

  private async validateLogicAppName(name: string | undefined, context: IProjectWizardContext): Promise<string | undefined> {
    if (!name || name.length === 0) {
      return localize('logicAppNameEmpty', 'Logic app name cannot be empty');
    }

    if (fse.existsSync(context.workspaceCustomFilePath)) {
      const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(context.workspaceCustomFilePath));
      const workspaceFileJson = JSON.parse(workspaceFileContent.toString());

      if (workspaceFileJson.folders && workspaceFileJson.folders.some((folder: { name: string }) => folder.name === name)) {
        return localize('logicAppNameExists', 'A project with this name already exists in the workspace');
      }
    }

    if (!logicAppNameValidation.test(name)) {
      return localize(
        'logicAppNameInvalidMessage',
        'Logic app name must start with a letter and can only contain letters, digits, "_" and "-".'
      );
    }

    return undefined;
  }
}
