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
      { label: localize('workflowstandard', 'Workflow Standard'), data: [true, false, /^WS$/i] },
      { label: localize('hybrid', 'Hybrid'), data: [false, false, undefined] },
    ];

    [wizardContext.useWorkflowStandard, wizardContext.suppressCreate, wizardContext.planSkuFamilyFilter] = (
      await wizardContext.ui.showQuickPick(picks, { placeHolder })
    ).data;

    wizardContext.telemetry.properties.useWorkflowStandard = wizardContext.useWorkflowStandard ? 'true' : 'false';
    wizardContext.telemetry.properties.planSkuFamilyFilter = wizardContext.planSkuFamilyFilter && wizardContext.planSkuFamilyFilter.source;
    wizardContext.telemetry.properties.suppressCreate = wizardContext.suppressCreate ? 'true' : 'false';

    setSiteOS(wizardContext);
  }

  public shouldPrompt(wizardContext: ILogicAppWizardContext): boolean {
    return wizardContext.useWorkflowStandard === undefined;
  }

  public async getSubWizard(wizardContext: ILogicAppWizardContext): Promise<IWizardOptions<ILogicAppWizardContext> | undefined> {
    const { suppressCreate, useWorkflowStandard } = wizardContext;
    if (useWorkflowStandard) {
      return { promptSteps: [new AppServicePlanListStep(suppressCreate), new ResourceGroupListStep()] };
    }
    return { promptSteps: [new ResourceGroupListStep(), new ConnectedEnvironmentStep()] };
  }
}
