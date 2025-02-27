/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import * as vscode from 'vscode';
import * as fse from 'fs-extra';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import * as path from 'path';

export class setMethodName extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.methodName = await context.ui.showInputBox({
      placeHolder: localize('setFunctioname', 'Function name'),
      prompt: localize('functionNamePrompt', 'Provide a function name for functions app project'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateFunctionName(input, context),
    });
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private async validateFunctionName(name: string | undefined, context: IProjectWizardContext): Promise<string | undefined> {
    if (!name) {
      return localize('emptyTemplateNameError', `Can't have an empty function name.`);
    }
    if (!/^[a-z][a-z\d_]*$/i.test(name)) {
      return localize(
        'functionNameInvalidMessage',
        'The function name must start with a letter and can only contain letters, digits, or underscores ("_").'
      );
    }

    if (name === context.logicAppName) {
      return localize('functionNameSameAsProjectNameError', `Can't use the same name for the function name and the project name.`);
    }

    if (fse.existsSync(context.workspaceCustomFilePath)) {
      const workspaceFileContent = await vscode.workspace.fs.readFile(vscode.Uri.file(context.workspaceCustomFilePath));
      const workspaceFileJson = JSON.parse(workspaceFileContent.toString());

      if (workspaceFileJson.folders && workspaceFileJson.folders.some((folder: { path: string }) => folder.path === path.join('.', name))) {
        return localize('functionNameExistsInWorkspaceError', 'A function with this name already exists in the workspace.');
      }
    }
  }
}
