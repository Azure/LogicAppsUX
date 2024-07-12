/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../../localize';
import { setSiteOS } from '../../../tree/subscriptionTree/SubscriptionTreeItem';
import { AppServicePlanListStep } from '@microsoft/vscode-azext-azureappservice';
import { AzureWizardPromptStep, type IAzureQuickPickItem, type IWizardOptions } from '@microsoft/vscode-azext-utils';
import { ConnectedEnvironmentStep } from './HybridLogicAppsSteps/ConnectedEnvironmentStep';
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';

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
    if (useHybrid) {
      wizardContext.newSiteName = wizardContext.newSiteName.toLowerCase();
      return { promptSteps: [new ResourceGroupListStep(), new ConnectedEnvironmentStep()] };
    }
    return { promptSteps: [new AppServicePlanListStep(suppressCreate), new ResourceGroupListStep()] };
  }
}
