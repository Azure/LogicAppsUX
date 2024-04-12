/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ext } from '../../../../extensionVariables';
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class SetLogicAppName extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const logicAppName = await context.ui.showInputBox({
      placeHolder: localize('logicAppNamePlaceHolder', 'Logic App name'),
      prompt: localize('logicAppNamePrompt', 'Enter a name for your Logic App project'),
      validateInput: (value: string): string | undefined => {
        if (!value || value.length === 0) {
          return localize('projectNameEmpty', 'Project name cannot be empty');
        }
        return undefined;
      },
    });

    context.logicAppName = logicAppName;
    ext.outputChannel.appendLog(localize('logicAppNameSet', `Logic App project name set to ${logicAppName}`));
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.isCustomCodeLogicApp && context.isCustomCodeLogicApp !== null;
  }
}
