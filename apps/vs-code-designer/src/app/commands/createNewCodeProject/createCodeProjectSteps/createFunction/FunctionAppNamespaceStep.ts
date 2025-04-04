/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../../extensionVariables';
import { localize } from '../../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class FunctionAppNamespaceStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.functionAppNamespace = await context.ui.showInputBox({
      placeHolder: localize('setNamespace', 'namespace'),
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

    if (!/^[a-zA-Z][a-zA-Z\d_]*$/i.test(namespace)) {
      return localize(
        'namespaceInvalidMessage',
        'The namespace must start with a letter and can only contain letters, digits, or underscores ("_").'
      );
    }
  }
}
