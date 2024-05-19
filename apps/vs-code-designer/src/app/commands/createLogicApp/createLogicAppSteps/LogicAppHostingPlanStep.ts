/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { setSiteOS } from '../../../tree/subscriptionTree/SubscriptionTreeItem';
import type { IAppServiceWizardContext } from '@microsoft/vscode-azext-azureappservice';
import { AppServicePlanListStep } from '@microsoft/vscode-azext-azureappservice';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureQuickPickItem, IWizardOptions } from '@microsoft/vscode-azext-utils';

interface AppServiceWizardContext extends IAppServiceWizardContext {
  suppressCreate: boolean;
}

export class LogicAppHostingPlanStep extends AzureWizardPromptStep<AppServiceWizardContext> {
  public async prompt(wizardContext: AppServiceWizardContext): Promise<void> {
    const placeHolder: string = localize('selectHostingPlan', 'Select a hosting plan.');
    const picks: IAzureQuickPickItem<[boolean, boolean, RegExp | undefined]>[] = [
      { label: localize('workflowstandard', 'Workflow Standard'), data: [false, false, /^WS$/i] },
      { label: localize('dedicated', 'App Service Plan'), data: [false, true, /^IV2$/i] },
    ];

    [wizardContext.useConsumptionPlan, wizardContext.suppressCreate, wizardContext.planSkuFamilyFilter] = (
      await wizardContext.ui.showQuickPick(picks, { placeHolder })
    ).data;

    setSiteOS(wizardContext);
  }

  public shouldPrompt(wizardContext: AppServiceWizardContext): boolean {
    return !wizardContext.customLocation && wizardContext.useConsumptionPlan === undefined;
  }

  public async getSubWizard(wizardContext: AppServiceWizardContext): Promise<IWizardOptions<AppServiceWizardContext> | undefined> {
    const { suppressCreate, useConsumptionPlan } = wizardContext;
    if (!useConsumptionPlan) {
      return { promptSteps: [new AppServicePlanListStep(suppressCreate)] };
    }
    return undefined;
  }
}
