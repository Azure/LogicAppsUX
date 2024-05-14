/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { type IProjectWizardContext, TargetFramework } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../../../localize';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { Platform } from '../../../../../constants';

export class TargetFrameworkStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('selectTargetFramework', 'Select a target framework.');
    const picks: IAzureQuickPickItem<TargetFramework>[] = [{ label: localize('Net8', '.NET 8'), data: TargetFramework.Net8 }];
    if (process.platform === Platform.windows) {
      picks.unshift({ label: localize('NetFx', '.NET Framework'), data: TargetFramework.NetFx });
    }
    context.targetFramework = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.isCustomCodeLogicApp === true;
  }
}
