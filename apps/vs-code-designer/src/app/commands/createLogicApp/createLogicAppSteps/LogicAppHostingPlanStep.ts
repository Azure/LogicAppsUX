/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { setSiteOS } from '../../../tree/subscriptionTree/SubscriptionTreeItem';
import { ContainerAppsStep } from './Containers/ContainerAppsStep';
import { AppServicePlanListStep } from '@microsoft/vscode-azext-azureappservice';
import {
  StorageAccountListStep,
  StorageAccountKind,
  StorageAccountPerformance,
  StorageAccountReplication,
  type INewStorageAccountDefaults,
} from '@microsoft/vscode-azext-azureutils';
import { AzureWizardPromptStep, type IAzureQuickPickItem, type IWizardOptions } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension';

export class LogicAppHostingPlanStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const placeHolder: string = localize('selectHostingPlan', 'Select a hosting plan.');
    const picks: IAzureQuickPickItem<[boolean, boolean, RegExp, boolean]>[] = [
      { label: localize('workflowstandard', 'Workflow Standard'), data: [false, false, /^WS$/i, false] },
      { label: localize('dedicated', 'App Service Plan'), data: [false, true, /^IV2$/i, false] },
      { label: localize('container apps', 'Container Apps Environment'), data: [false, true, /^IV2$/i, true] },
    ];

    [wizardContext.useConsumptionPlan, wizardContext.suppressCreate, wizardContext.planSkuFamilyFilter, wizardContext.useContainerApps] = (
      await wizardContext.ui.showQuickPick(picks, { placeHolder })
    ).data;

    wizardContext.telemetry.properties.useConsumptionPlan = wizardContext.useConsumptionPlan ? 'true' : 'false';
    wizardContext.telemetry.properties.planSkuFamilyFilter = wizardContext.planSkuFamilyFilter.source;
    wizardContext.telemetry.properties.useContainerApps = wizardContext.useContainerApps ? 'true' : 'false';

    setSiteOS(wizardContext);
  }

  public shouldPrompt(wizardContext: ILogicAppWizardContext): boolean {
    return !wizardContext.customLocation && wizardContext.useConsumptionPlan === undefined;
  }

  public async getSubWizard(wizardContext: ILogicAppWizardContext): Promise<IWizardOptions<ILogicAppWizardContext> | undefined> {
    const { suppressCreate, useConsumptionPlan, useContainerApps } = wizardContext;

    if (useContainerApps) {
      const storageAccountCreateOptions: INewStorageAccountDefaults = {
        kind: StorageAccountKind.Storage,
        performance: StorageAccountPerformance.Standard,
        replication: StorageAccountReplication.LRS,
      };
      return {
        promptSteps: [
          new ContainerAppsStep(),
          new StorageAccountListStep(storageAccountCreateOptions, {
            kind: [StorageAccountKind.BlobStorage],
            performance: [StorageAccountPerformance.Premium],
            replication: [StorageAccountReplication.ZRS],
            learnMoreLink: 'https://aka.ms/Cfqnrc',
          }),
        ],
      };
    } else if (!useConsumptionPlan) {
      return { promptSteps: [new AppServicePlanListStep(suppressCreate)] };
    }
    return undefined;
  }
}
