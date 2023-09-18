/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { createContainerClient } from '../../../../utils/azureClients';
import type { AppServiceWizardContext } from '../LogicAppHostingPlanStep';
import type { ContainerApp } from '@azure/arm-appcontainers';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';

export class ContainerAppsStep extends AzureWizardPromptStep<AppServiceWizardContext> {
  public async prompt(wizardContext: AppServiceWizardContext): Promise<void> {
    const placeHolder: string = localize('selectNewProjectFolder', 'Select a Container Apps environment.');
    wizardContext.containerApp = (await wizardContext.ui.showQuickPick(this.getPicks(wizardContext), { placeHolder })).data;
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private async getPicks(wizardContext: AppServiceWizardContext): Promise<IAzureQuickPickItem<ContainerApp>[]> {
    const client = await createContainerClient(wizardContext);
    const listOfSites = await uiUtils.listAllIterator(client.managedEnvironments.listBySubscription());
    const picks = listOfSites.map((site) => {
      return { label: site.name, data: site };
    });
    picks.unshift({ label: localize('newContainerApp', '$(plus) Create new Container Apps environment'), data: undefined });

    return picks;
  }
}
