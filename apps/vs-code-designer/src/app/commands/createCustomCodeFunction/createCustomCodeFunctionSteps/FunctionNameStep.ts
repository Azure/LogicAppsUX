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

export class FunctionNameStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.customCodeFunctionName = await context.ui.showInputBox({
      placeHolder: localize('setFunctionName', 'Function name'),
      prompt: localize('functionNamePrompt', 'Provide a function name'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateFunctionName(input, context),
    });

    ext.outputChannel.appendLog(localize('functionNameSet', `Function name set to ${context.customCodeFunctionName}`));
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private async validateFunctionName(name: string | undefined, context: IProjectWizardContext): Promise<string | undefined> {
    if (!name || name.length === 0) {
      return localize('emptyFunctionNameError', `Can't have an empty function name.`);
    }

    if (!/^[a-z][a-z\d_]*$/i.test(name)) {
      return localize(
        'functionNameInvalidMessage',
        'The function name must start with a letter and can only contain letters, digits, or underscores ("_").'
      );
    }

    if (name === context.logicAppName) {
      return localize('functionNameSameAsProjectNameError', `Can't use the same name for the function and the logic app project.`);
    }

    if (context.functionFolderPath && fse.existsSync(context.functionFolderPath)) {
      const functionAppFiles = await vscode.workspace.fs.readDirectory(vscode.Uri.file(context.functionFolderPath));
      const functionFileNames = functionAppFiles
        .map((file) => file[0])
        .filter((fileName) => fileName.endsWith('.cs'))
        .map((functionFile) => functionFile.split('.')[0]);

      if (functionFileNames && functionFileNames.includes(name)) {
        return localize('functionNameExistsInFunctionsProjectError', 'A function with this name already exists in the functions project.');
      }
    }
  }
}
