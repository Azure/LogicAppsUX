/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension';

export class setNamespace extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    context.namespaceName = await context.ui.showInputBox({
      placeHolder: localize('setNamespace', 'namespace'),
      prompt: localize('methodNamePrompt', 'Provide a namespace for functions project'),
    });
  }

  public shouldPrompt(_context: IProjectWizardContext): boolean {
    return true;
  }
}
