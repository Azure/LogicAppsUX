/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import {
  type AzureWizardExecuteStep,
  AzureWizardPromptStep,
  type IWizardOptions,
  type IAzureQuickPickItem,
} from '@microsoft/vscode-azext-utils';
import { DeploymentScriptType } from '@microsoft/vscode-extension-logic-apps';
import type { IAzureDeploymentScriptsContext } from '../generateDeploymentScripts';
import { GenerateADODeploymentScriptsStep } from './adoDeploymentScriptsSteps/generateADODeploymentScriptsStep';
import { GenerateDeploymentCenterScriptsStep } from './deploymentCenterScriptsSteps/generateDeploymentCenterScriptsStep';
import * as path from 'path';
import { SubscriptionAndResourceGroupStep } from './subscriptionAndResourceGroupStep';
import { LogicAppNameStep } from './adoDeploymentScriptsSteps/logicAppNameStep';
import { StorageAccountNameStep } from './adoDeploymentScriptsSteps/storageAccountNameStep';
import { AppServicePlanNameStep } from './adoDeploymentScriptsSteps/appServicePlanNameStep';
import { LogicAppStep } from './deploymentCenterScriptsSteps/logicAppStep';
import { LogicAppMSIStep } from './deploymentCenterScriptsSteps/logicAppMSIStep';

export class DeploymentScriptTypeStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public shouldPrompt(): boolean {
    return true;
  }

  /**
   * Prompts the user for a deployment script type.
   * @param context - The Azure deployment scripts context.
   */
  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'DeploymentScriptTypeStep';
    const placeHolder = localize('setDeploymentScriptType', 'Deployment script type');
    const picks: IAzureQuickPickItem<DeploymentScriptType>[] = [
      { label: localize('azureDevOpsPipeline', 'Azure DevOps Pipeline'), data: DeploymentScriptType.azureDevOpsPipeline },
      { label: localize('azureDeploymentCenter', 'Azure Deployment Center'), data: DeploymentScriptType.azureDeploymentCenter },
    ];
    context.deploymentScriptType = (await context.ui.showQuickPick(picks, { placeHolder })).data;
  }

  /**
   * Appends prompt and execute steps based on the selected deployment script type.
   * @param context - The Azure deployment scripts context.
   */
  public async getSubWizard(context: IAzureDeploymentScriptsContext): Promise<IWizardOptions<IAzureDeploymentScriptsContext>> {
    let promptSteps: AzureWizardPromptStep<IAzureDeploymentScriptsContext>[] = [];
    let executeSteps: AzureWizardExecuteStep<IAzureDeploymentScriptsContext>[] = [];
    if (context.deploymentScriptType === DeploymentScriptType.azureDevOpsPipeline) {
      context.telemetry.properties.deploymentScriptType = 'azureDevOpsPipeline';
      promptSteps = [
        new SubscriptionAndResourceGroupStep(),
        new LogicAppNameStep(),
        new StorageAccountNameStep(),
        new AppServicePlanNameStep(),
      ];
      executeSteps = [new GenerateADODeploymentScriptsStep()];
    } else {
      context.telemetry.properties.deploymentScriptType = 'azureDeploymentCenter';
      context.localLogicAppName = path.basename(context.projectPath);
      promptSteps = [new SubscriptionAndResourceGroupStep(), new LogicAppStep(), new LogicAppMSIStep()];
      executeSteps = [new GenerateDeploymentCenterScriptsStep()];
    }

    return { promptSteps, executeSteps };
  }
}
