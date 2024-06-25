/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { localize } from '../../../../localize';
import { setSiteOS } from '../../../tree/subscriptionTree/SubscriptionTreeItem';
// import { AppServicePlanListStep } from '@microsoft/vscode-azext-azureappservice';
import { AzureWizardPromptStep, type IAzureQuickPickItem, type IWizardOptions } from '@microsoft/vscode-azext-utils';

export class LogicAppHostingPlanStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const placeHolder: string = localize('selectHostingPlan', 'Select a hosting plan.');
    const picks: IAzureQuickPickItem<[boolean, boolean, RegExp | undefined]>[] = [
      { label: localize('workflowstandard', 'Workflow Standard'), data: [false, false, /^WS$/i] },
      { label: localize('dedicated', 'App Service Plan'), data: [false, true, /^IV2$/i] },
    ];

    [wizardContext.useConsumptionPlan, wizardContext.suppressCreate, wizardContext.planSkuFamilyFilter] = (
      await wizardContext.ui.showQuickPick(picks, { placeHolder })
    ).data;

    wizardContext.telemetry.properties.useConsumptionPlan = wizardContext.useConsumptionPlan ? 'true' : 'false';
    wizardContext.telemetry.properties.planSkuFamilyFilter = wizardContext.planSkuFamilyFilter.source;
    wizardContext.telemetry.properties.suppressCreate = wizardContext.suppressCreate ? 'true' : 'false';

    setSiteOS(wizardContext);
  }

  public shouldPrompt(wizardContext: ILogicAppWizardContext): boolean {
    return !wizardContext.customLocation && wizardContext.useConsumptionPlan === undefined;
  }

  public async getSubWizard(_wizardContext: ILogicAppWizardContext): Promise<IWizardOptions<ILogicAppWizardContext> | undefined> {
    // const { suppressCreate, useConsumptionPlan } = wizardContext;
    // if (!useConsumptionPlan) {
    //   return { promptSteps: [new AppServicePlanListStep(suppressCreate)] };
    // }
    return undefined;
  }
}
