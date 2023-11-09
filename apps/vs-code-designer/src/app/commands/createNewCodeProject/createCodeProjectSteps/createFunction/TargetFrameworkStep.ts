/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { TargetFramework, type IProjectWizardContext } from '@microsoft/vscode-extension';

export class TargetFrameworkStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('selectTargetFramework', 'Select a target framework.');
    const picks: IAzureQuickPickItem<TargetFramework>[] = [
      { label: localize('NetFx', '.NET Framework'), data: TargetFramework.NetFx },
      { label: localize('Net6', '.NET 6.0'), data: TargetFramework.Net6 },
    ];

    context.targetFramework = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  public shouldPrompt(_context: IProjectWizardContext): boolean {
    return true;
  }
}
