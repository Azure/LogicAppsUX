/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';

export class setMethodName extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.methodName = await context.ui.showInputBox({
      placeHolder: localize('setFunctioname', 'Function name'),
      prompt: localize('functionNamePrompt', 'Provide a function name for functions app project'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateFunctionName(input),
    });
  }

  public shouldPrompt(_context: IProjectWizardContext): boolean {
    return true;
  }

  private async validateFunctionName(name: string | undefined): Promise<string | undefined> {
    if (!name) {
      return localize('emptyTemplateNameError', 'The function name cannot be empty.');
    } else if (!/^[a-z][a-z\d_]*$/i.test(name)) {
      return localize('functionNameInvalidMessage', 'Function name must start with a letter and can only contain letters, digits and "_".');
    }
  }
}
