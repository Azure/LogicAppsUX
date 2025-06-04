/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../../localize';
import { setSiteOS } from '../../../tree/subscriptionTree/SubscriptionTreeItem';
import { AppServicePlanListStep, CustomLocationListStep } from '@microsoft/vscode-azext-azureappservice';
import { AzureWizardPromptStep, type IAzureQuickPickItem, type IWizardOptions } from '@microsoft/vscode-azext-utils';
import { ConnectedEnvironmentStep } from './HybridLogicAppsSteps/ConnectedEnvironmentStep';
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';
import { sendAzureRequest } from '../../../utils/requestUtils';
import { HTTP_METHODS } from '@microsoft/logic-apps-shared';
import { workflowAppApiVersionNew } from '../../../../constants';
import { ContainerAppNameStep } from './HybridLogicAppsSteps/ContainerAppNameStep';

export class LogicAppHostingPlanStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const placeHolder: string = localize('selectHostingPlan', 'Select a hosting plan.');
    const picks: IAzureQuickPickItem<[boolean, boolean, RegExp | undefined]>[] = [
      { label: localize('workflowstandard', 'Workflow Standard'), data: [false, false, /^WS$/i] },
      { label: localize('hybrid', 'Hybrid'), data: [true, false, undefined] },
    ];

    [wizardContext.useHybrid, wizardContext.suppressCreate, wizardContext.planSkuFamilyFilter] = (
      await wizardContext.ui.showQuickPick(picks, { placeHolder })
    ).data;

    wizardContext.telemetry.properties.useHybrid = wizardContext.useHybrid ? 'true' : 'false';
    wizardContext.telemetry.properties.planSkuFamilyFilter = wizardContext.planSkuFamilyFilter && wizardContext.planSkuFamilyFilter.source;
    wizardContext.telemetry.properties.suppressCreate = wizardContext.suppressCreate ? 'true' : 'false';

    setSiteOS(wizardContext);
  }

  public shouldPrompt(): boolean {
    return true;
  }

  public async getSubWizard(wizardContext: ILogicAppWizardContext): Promise<IWizardOptions<ILogicAppWizardContext> | undefined> {
    const { suppressCreate, useHybrid } = wizardContext;
    const promptSteps = [];
    CustomLocationListStep.addStep(wizardContext as any, promptSteps);
    if (useHybrid) {
      this.setHybridPlanProperties(wizardContext);
      promptSteps.push(new ResourceGroupListStep(), new ContainerAppNameStep(), new ConnectedEnvironmentStep());
    } else {
      promptSteps.push(new AppServicePlanListStep(suppressCreate), new ResourceGroupListStep());
    }
    return { promptSteps: promptSteps };
  }

  private setHybridPlanProperties(wizardContext: ILogicAppWizardContext) {
    wizardContext.newSiteName = wizardContext.newSiteName.toLowerCase();
    CustomLocationListStep.setLocationSubset(wizardContext, this.getAllLocations(wizardContext), 'Microsoft.Resources');
  }

  private async getAllLocations(wizardContext: ILogicAppWizardContext): Promise<string[]> {
    const url = `/subscriptions/${wizardContext.subscriptionId}/providers/Microsoft.Web/georegions?api-version=${workflowAppApiVersionNew}`;
    const locationsResponse = await sendAzureRequest(url, wizardContext, HTTP_METHODS.GET, wizardContext);
    const locations = (locationsResponse.parsedBody as { value }).value.map((loc) => loc.name) as string[];
    return locations;
  }
}
