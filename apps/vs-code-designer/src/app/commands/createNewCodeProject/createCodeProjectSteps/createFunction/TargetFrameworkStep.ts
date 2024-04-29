/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { type IProjectWizardContext, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../../../localize';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';

export class TargetFrameworkStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('selectTargetFramework', 'Select a target framework.');
    const picks: IAzureQuickPickItem<TargetFramework>[] = [
      { label: localize('NetFx', '.NET Framework'), data: TargetFramework.NetFx },
      { label: localize('Net6', '.NET 6'), data: TargetFramework.Net6 },
      { label: localize('Net6', '.NET 8'), data: TargetFramework.Net8 },
    ];

    context.targetFramework = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  public shouldPrompt(_context: IProjectWizardContext): boolean {
    return true;
  }
}
