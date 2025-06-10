/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { namespaceValidation } from '../../../../../constants';
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class FunctionAppNamespaceStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.functionAppNamespace = await context.ui.showInputBox({
      placeHolder: localize('setNamespace', 'Namespace'),
      prompt: localize('methodNamePrompt', 'Provide a namespace for functions project'),
      validateInput: async (input: string): Promise<string | undefined> => await this.validateNamespace(input),
    });

    ext.outputChannel.appendLog(
      localize('functionAppNamespaceSet', `Function App project namespace set to ${context.functionAppNamespace}`)
    );
  }

  public shouldPrompt(_context: IProjectWizardContext): boolean {
    return true;
  }

  private async validateNamespace(namespace: string | undefined): Promise<string | undefined> {
    if (!namespace) {
      return localize('emptyNamespaceError', `Can't have an empty namespace.`);
    }

    if (!namespaceValidation.test(namespace)) {
      return localize(
        'namespaceInvalidMessage',
        'The namespace must start with a letter or underscore, contain only letters, digits, underscores, and periods, and must not end with a period.'
      );
    }
  }
}
