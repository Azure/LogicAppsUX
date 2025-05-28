/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import type { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';

/**
 * Represents a step in the logic app creation process that prompts which deployment method to use.
 */
export class HybridDeploymentStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  /**
   * Prompts the user for the deployment method and sets the values in the wizard context.
   * @param {ILogicAppWizardContext} wizardContext The wizard context.
   */
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const placeHolder: string = localize('selectDeploymentMethod', 'Select a deployment method.');
    const picks: IAzureQuickPickItem<boolean | undefined>[] = [
      { label: localize('entraId', 'Using Entra ID'), data: true },
      { label: localize('smb', 'SMB deployment (legacy)'), data: false },
    ];

    wizardContext.useZipDeploy = (await wizardContext.ui.showQuickPick(picks, { placeHolder })).data;
  }
  /**
   * Determines whether this step should be prompted.
   * @returns True if this step should be prompted, false otherwise.
   */
  public shouldPrompt(): boolean {
    return true;
  }
}
