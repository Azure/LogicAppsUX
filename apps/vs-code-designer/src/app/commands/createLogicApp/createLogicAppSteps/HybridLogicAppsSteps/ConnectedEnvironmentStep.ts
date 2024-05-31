/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { createContainerClient } from '../../../../utils/azureClients';
import type { ContainerApp } from '@azure/arm-appcontainers';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class ConnectedEnvironmentStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const placeHolder: string = localize('selectNewProjectFolder', 'Select a Connected Environment.');
    const connectedEnvironment = (await wizardContext.ui.showQuickPick(this.getPicks(wizardContext), { placeHolder })).data;

    wizardContext.connectedEnvironment = connectedEnvironment;
    wizardContext.telemetry.properties.connectedEnvironment = wizardContext.containerApp?.name;
  }

  public shouldPrompt(wizardContext: ILogicAppWizardContext): boolean {
    return !!wizardContext.customLocation;
  }

  /**
   * Retrieves the picks for the connected environments in the Logic App wizard context.
   * @param {ILogicAppWizardContext} wizardContext - The Logic App wizard context.
   * @returns A promise that resolves to an array of Azure Quick Pick items representing the connected environments.
   */
  private async getPicks(wizardContext: ILogicAppWizardContext): Promise<IAzureQuickPickItem<ContainerApp>[]> {
    const client = await createContainerClient(wizardContext);
    const sitesList = await uiUtils.listAllIterator(client.connectedEnvironments.listBySubscription());
    const picks = sitesList.map((site) => {
      return { label: site.name, data: site };
    });
    picks.sort((a, b) => a.label.localeCompare(b.label));

    return picks;
  }
}
