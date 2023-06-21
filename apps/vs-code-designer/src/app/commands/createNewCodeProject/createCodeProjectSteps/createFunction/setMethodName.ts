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
    });
  }

  public shouldPrompt(_context: IProjectWizardContext): boolean {
    return true;
  }
}
