/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../localize';
import { createContainerRegistryManagementClient } from '../../../../utils/azureClients';
import type { AppServiceWizardContext } from '../LogicAppHostingPlanStep';
import type { Registry } from '@azure/arm-containerregistry';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';

export class RegistriesStep extends AzureWizardPromptStep<AppServiceWizardContext> {
  public async prompt(wizardContext: AppServiceWizardContext): Promise<void> {
    const placeHolder: string = localize('selectRegistry', 'Select registry.');
    wizardContext.registry = (await wizardContext.ui.showQuickPick(this.getPicks(wizardContext), { placeHolder })).data;
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private async getPicks(wizardContext: AppServiceWizardContext): Promise<IAzureQuickPickItem<Registry>[]> {
    const client = await createContainerRegistryManagementClient(wizardContext);
    const listOfRegistries = await uiUtils.listAllIterator(client.registries.list());
    return listOfRegistries.map((registry) => {
      return { label: registry.name, data: registry };
    });
  }
}
