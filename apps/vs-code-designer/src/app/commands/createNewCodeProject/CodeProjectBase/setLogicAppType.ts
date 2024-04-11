/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class SetLogicAppType extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const picks: IAzureQuickPickItem<boolean>[] = [
      { label: localize('logicApp', 'Logic app'), data: false },
      { label: localize('logicAppCustomCode', 'Logic app with custom code project'), data: true },
    ];

    const placeHolder = localize('logicAppProjectTemplatePlaceHolder', 'Select a project template for your logic app workspace');
    context.isCustomCodeLogicApp = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.isCustomCodeLogicApp === undefined;
  }
}
