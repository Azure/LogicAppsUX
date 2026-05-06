/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep, type IAzureQuickPickItem, type IWizardOptions } from '@microsoft/vscode-azext-utils';
import { DeploymentTargetType } from '@microsoft/vscode-extension-logic-apps';
import type { IAzureDeploymentScriptsContext } from '../generateDeploymentScripts';
import { StorageAccountNameStep } from './adoDeploymentScriptsSteps/StorageAccountNameStep';
import { AppServicePlanNameStep } from './adoDeploymentScriptsSteps/AppServicePlanNameStep';
import { ConnectedEnvironmentStep } from './adoDeploymentScriptsSteps/ConnectedEnvironmentStep';
import { SubscriptionAndResourceGroupStep } from './SubscriptionAndResourceGroupStep';

// (NOTE: anandgmenon) Prompts user to choose Standard (App Service) vs Hybrid (Container Apps) deployment target.
export class DeploymentTargetStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public shouldPrompt(): boolean {
    return true;
  }

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'DeploymentTargetStep';
    const placeHolder = localize('setDeploymentTarget', 'Select deployment target');
    const picks: IAzureQuickPickItem<DeploymentTargetType>[] = [
      {
        label: localize('standardTarget', 'Standard (Azure App Service)'),
        description: localize('standardTargetDescription', 'Deploy to Logic Apps Standard on Azure App Service'),
        data: DeploymentTargetType.standard,
      },
      {
        label: localize('hybridTarget', 'Hybrid (Container Apps)'),
        description: localize('hybridTargetDescription', 'Deploy to Logic Apps Hybrid on Azure Container Apps'),
        data: DeploymentTargetType.hybrid,
      },
    ];
    context.deploymentTarget = (await context.ui.showQuickPick(picks, { placeHolder })).data;
    context.telemetry.properties.deploymentTarget = context.deploymentTarget;
  }

  // (NOTE: anandgmenon) Branches wizard steps based on deployment target.
  // SubscriptionAndResourceGroupStep is injected here (after target selection) so subscriptionId
  // is available for ConnectedEnvironmentStep in the Hybrid path.
  public async getSubWizard(context: IAzureDeploymentScriptsContext): Promise<IWizardOptions<IAzureDeploymentScriptsContext>> {
    if (context.deploymentTarget === DeploymentTargetType.hybrid) {
      return { promptSteps: [new SubscriptionAndResourceGroupStep(), new ConnectedEnvironmentStep()] };
    }
    return { promptSteps: [new SubscriptionAndResourceGroupStep(), new StorageAccountNameStep(), new AppServicePlanNameStep()] };
  }
}
