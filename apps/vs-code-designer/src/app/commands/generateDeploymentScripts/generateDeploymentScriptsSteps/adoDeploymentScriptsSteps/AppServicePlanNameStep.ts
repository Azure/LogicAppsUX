import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';

export class AppServicePlanNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.appServicePlan = await context.ui.showInputBox({
      placeHolder: localize('setAppPlanName', 'App Service plan name'),
      prompt: localize('appPlanNamePrompt', 'Provide a unique name for the App Service plan.'),
      validateInput: (value: string): string | undefined => {
        if (!value || value.length === 0) {
          return localize('appPlanNameEmpty', 'App Service plan name cannot be empty.');
        }
        return undefined;
      },
    });
  }

  public shouldPrompt(): boolean {
    return true;
  }
}
