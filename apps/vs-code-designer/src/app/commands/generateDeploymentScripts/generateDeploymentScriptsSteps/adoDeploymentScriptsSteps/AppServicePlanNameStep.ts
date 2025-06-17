import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';
import { deployedAppServicePlanNameValidation } from '../../../../../constants';

export class AppServicePlanNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'AppServicePlanNameStep';
    context.appServicePlan = await context.ui.showInputBox({
      placeHolder: localize('setAppPlanName', 'App Service plan name'),
      prompt: localize('appPlanNamePrompt', 'Provide a unique name for the App Service plan.'),
      validateInput: (input: string): string | undefined => this.validateAppServicePlanName(input),
    });
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private validateAppServicePlanName(name: string | undefined): string | undefined {
    if (!name || name.length === 0) {
      return localize('appServicePlanNameEmpty', 'App Service plan name cannot be empty.');
    }

    if (!deployedAppServicePlanNameValidation.test(name)) {
      return localize(
        'appServicePlanNameInvalid',
        'App Service plan name can only contain alphanumeric characters and hyphens and must be 1-60 characters long.'
      );
    }

    return undefined;
  }
}
