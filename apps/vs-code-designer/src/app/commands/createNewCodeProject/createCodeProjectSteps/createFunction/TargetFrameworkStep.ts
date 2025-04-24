/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { type IProjectWizardContext, TargetFramework, ProjectType } from '@microsoft/vscode-extension-logic-apps';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../../../localize';
import { Platform } from '../../../../../constants';

/**
 * Represents a step in the project creation wizard for selecting the target framework.
 */
export class TargetFrameworkStep extends AzureWizardPromptStep<IProjectWizardContext> {
  public hideStepCount = true;

  /**
   * Prompts the user to select a target framework.
   * @param {IProjectWizardContext} context - The project wizard context.
   */
  public async prompt(context: IProjectWizardContext): Promise<void> {
    const placeHolder: string = localize('selectTargetFramework', 'Select a target framework.');
    const picks: IAzureQuickPickItem<TargetFramework>[] = [{ label: localize('Net8', '.NET 8'), data: TargetFramework.Net8 }];
    if (process.platform === Platform.windows) {
      picks.unshift({ label: localize('NetFx', '.NET Framework'), data: TargetFramework.NetFx });
    }
    context.targetFramework = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  /**
   * Determines whether this step should be prompted based on the project wizard context.
   * @param {IProjectWizardContext} context - The project wizard context.
   * @returns True if this step should be prompted, false otherwise.
   */
  public shouldPrompt(context: IProjectWizardContext): boolean {
    return context.projectType === ProjectType.customCode;
  }
}
