/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { createContainerClient } from '../../../../utils/azureClients';
import type { ContainerApp } from '@azure/arm-appcontainers';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import type { IWizardOptions, IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { HostNameStep } from './FileShare/HostNameStep';
import { FileSharePathStep } from './FileShare/FileSharePathStep';
import { UserNameStep } from './FileShare/UserNameStep';
import { PasswordStep } from './FileShare/PasswordStep';
import { SQLStringNameStep } from '../../../deploy/storageAccountSteps/SQLStringNameStep';

/**
 * Represents a step in the Logic App creation wizard for selecting a connected environment.
 */
export class ConnectedEnvironmentStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  /**
   * Prompts the user to select a connected environment and sets it in the wizard context.
   * @param {ILogicAppWizardContext} wizardContext - The Logic App wizard context.
   */
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const placeHolder: string = localize('selectNewProjectFolder', 'Select a Connected Environment.');
    const connectedEnvironment = (await wizardContext.ui.showQuickPick(this.getPicks(wizardContext), { placeHolder })).data;

    wizardContext.connectedEnvironment = connectedEnvironment;
    wizardContext.telemetry.properties.connectedEnvironment = wizardContext.connectedEnvironment.name;
  }

  /**
   * Determines whether this step should be prompted based on the wizard context.
   * @param {ILogicAppWizardContext} wizardContext - The Logic App wizard context.
   * @returns {boolean} - True if this step should be prompted, false otherwise.
   */
  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Retrieves the picks for the connected environments in the Logic App wizard context.
   * @param {ILogicAppWizardContext} wizardContext - The Logic App wizard context.
   * @returns {Promise<IAzureQuickPickItem<ContainerApp>[]>} - A promise that resolves to an array of Azure Quick Pick items representing the connected environments.
   */
  private async getPicks(wizardContext: ILogicAppWizardContext): Promise<IAzureQuickPickItem<ContainerApp>[]> {
    const client = await createContainerClient(wizardContext);
    const location = wizardContext.customLocation
      ? wizardContext.customLocation.kubeEnvironment.location.replace(/[()]/g, '')
      : wizardContext._location.name;
    const sitesList = (await uiUtils.listAllIterator(client.connectedEnvironments.listBySubscription())).filter(
      (connectedEnvironment) => connectedEnvironment.location === location
    );
    const picks = sitesList.map((site) => {
      return { label: site.name, data: site };
    });
    picks.sort((a, b) => a.label.localeCompare(b.label));

    return picks;
  }

  public async getSubWizard(wizardContext: ILogicAppWizardContext): Promise<IWizardOptions<ILogicAppWizardContext> | undefined> {
    wizardContext.fileShare = {};
    return {
      promptSteps: [new SQLStringNameStep(), new HostNameStep(), new FileSharePathStep(), new UserNameStep(), new PasswordStep()],
    };
  }
}
