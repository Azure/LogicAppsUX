/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';

interface ILogicAppPickData {
  isCustomCodeLogicApp: boolean;
  initializeStaticWebApp: boolean;
}

export class SetLogicAppType extends AzureWizardPromptStep<IProjectWizardContext> {
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const picks: IAzureQuickPickItem<ILogicAppPickData>[] = [
      { label: localize('logicApp', 'Logic app'), data: { isCustomCodeLogicApp: false, initializeStaticWebApp: false } },
      {
        label: localize('logicAppCustomCode', 'Logic app with custom code project'),
        data: { isCustomCodeLogicApp: true, initializeStaticWebApp: false },
      },
      {
        label: localize('logicAppStaticWebApp', 'Logic app with Static Web App'),
        data: { isCustomCodeLogicApp: false, initializeStaticWebApp: true },
      },
    ];

    const placeHolder = localize('logicAppProjectTemplatePlaceHolder', 'Select a project template for your logic app workspace');
    const selectedPick = await context.ui.showQuickPick(picks, { placeHolder });

    context.isCustomCodeLogicApp = selectedPick.data.isCustomCodeLogicApp;
    context.initializeStaticWebApp = selectedPick.data.initializeStaticWebApp;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.isCustomCodeLogicApp === undefined && context.initializeStaticWebApp === undefined;
  }
}
