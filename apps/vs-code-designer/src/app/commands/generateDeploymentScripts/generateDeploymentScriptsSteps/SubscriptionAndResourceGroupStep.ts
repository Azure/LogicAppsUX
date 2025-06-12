import { AzureWizardPromptStep, type IActionContext, type IWizardOptions } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../generateDeploymentScripts';
import { ext } from '../../../../extensionVariables';
import { ResourceGroupListStep } from '@microsoft/vscode-azext-azureutils';

export class SubscriptionAndResourceGroupStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'SubscriptionAndResourceGroupStep';
    // No prompt needed for this step
  }

  public shouldPrompt(): boolean {
    return true;
  }

  public async getSubWizard(context: IAzureDeploymentScriptsContext): Promise<IWizardOptions<IAzureDeploymentScriptsContext>> {
    // TODO - this looks like it may have side effects by setting context.subscriptionId and context.resourceGroup
    const promptSteps: AzureWizardPromptStep<IActionContext>[] = [];
    const subscriptionPromptStep: AzureWizardPromptStep<IActionContext> | undefined =
      await ext.azureAccountTreeItem.getSubscriptionPromptStep(context);
    if (subscriptionPromptStep) {
      promptSteps.push(subscriptionPromptStep);
    }

    promptSteps.push(new ResourceGroupListStep());
    return { promptSteps, showLoadingPrompt: true };
  }
}
