/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { createContainerClient } from '../../../../utils/azureClients';
import { createManagedEnvironment } from './CreateManagedEnvironment';
import type { ContainerApp, ContainerAppsAPIClient } from '@azure/arm-appcontainers';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { AzureSubscription } from '@microsoft/vscode-azureresources-api';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension';

export class ContainerAppsStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const placeHolder: string = localize('selectNewProjectFolder', 'Select a Container Apps environment.');
    const client = await createContainerClient(wizardContext);

    const containerEnvironment = (await wizardContext.ui.showQuickPick(this.getPicks(client), { placeHolder })).data;
    if (!containerEnvironment) {
      wizardContext.containerApp = await createManagedEnvironment({ ...wizardContext }, {
        ...wizardContext,
      } as unknown as AzureSubscription);
    } else {
      wizardContext.containerApp = containerEnvironment;
    }
    wizardContext.telemetry.properties.containerApp = wizardContext.containerApp?.name;
  }

  public shouldPrompt(wizardContext: ILogicAppWizardContext): boolean {
    return !!wizardContext.useContainerApps;
  }

  private async getPicks(client: ContainerAppsAPIClient): Promise<IAzureQuickPickItem<ContainerApp>[]> {
    const sitesList = await uiUtils.listAllIterator(client.managedEnvironments.listBySubscription());
    const picks = sitesList.map((site) => {
      return { label: site.name, data: site };
    });
    picks.sort((a, b) => a.label.localeCompare(b.label));
    picks.unshift({ label: localize('newContainerApps', '$(plus) Create new Container Apps environment'), data: undefined });

    return picks;
  }
}
