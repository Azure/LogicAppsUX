/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { IProjectWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../localize';

export class InitializeStaticWebAppStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const picks: IAzureQuickPickItem<boolean>[] = [
      { label: localize('Yes', 'Yes'), data: true },
      { label: localize('No', 'No'), data: false },
    ];

    const placeHolder: string = localize('initStaticWebApp', 'Would you like to initialize a static web app (SWA)?');
    const result = await context.ui.showQuickPick(picks, { placeHolder });
    context.initializeStaticWebApp = result.data;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return !context.initializeStaticWebApp;
  }
}
