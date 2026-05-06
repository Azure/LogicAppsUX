/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AzureWizardPromptStep, type IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import type { ConnectedEnvironment } from '@azure/arm-appcontainers';
import { uiUtils } from '@microsoft/vscode-azext-azureutils';
import { createContainerClient } from '../../../../utils/azureClients';
import { localize } from '../../../../../localize';
import { ext } from '../../../../../extensionVariables';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';

// (NOTE: anandgmenon) Prompts user to select an existing Connected Environment for Hybrid deployment.
// Similar to the createLogicApp ConnectedEnvironmentStep but typed for the deployment scripts wizard context.
// Extracts the connected environment name and its resource group from the ARM resource ID.
export class ConnectedEnvironmentStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public shouldPrompt(): boolean {
    return true;
  }

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'ConnectedEnvironmentStep';
    const placeHolder = localize('selectConnectedEnvironment', 'Select a Connected Environment');
    const picked = (await context.ui.showQuickPick(this.getPicks(context), { placeHolder })).data;

    context.connectedEnvironmentName = picked.name;
    // Extract resource group from the ARM resource ID
    const rgMatch = picked.id?.match(/\/resourceGroups\/([^/]+)\//i);
    context.connectedEnvironmentResourceGroup = rgMatch ? rgMatch[1] : context.resourceGroup?.name;

    context.telemetry.properties.connectedEnvironmentName = context.connectedEnvironmentName;
  }

  private async getPicks(context: IAzureDeploymentScriptsContext): Promise<IAzureQuickPickItem<ConnectedEnvironment>[]> {
    // (NOTE: anandgmenon) Spread subscription onto context to satisfy AzExtClientContext — same pattern as LogicAppStep.
    const subscriptionNode = await ext.rgApi.appResourceTree.findTreeItem(`/subscriptions/${context.subscriptionId}`, context);
    if (!subscriptionNode) {
      throw new Error(`Failed to find a subscription with ID "${context.subscriptionId}".`);
    }
    const client = await createContainerClient({ ...context, ...subscriptionNode.subscription });
    const envList = await uiUtils.listAllIterator(client.connectedEnvironments.listBySubscription());
    const picks = envList.map((env) => ({
      label: env.name,
      description: env.location,
      data: env,
    }));
    picks.sort((a, b) => a.label.localeCompare(b.label));
    return picks;
  }
}
