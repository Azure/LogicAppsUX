import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';
import { deployedLogicAppNameValidation } from '../../../../../constants';

export class LogicAppNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'LogicAppNameStep';
    context.logicAppName = await context.ui.showInputBox({
      placeHolder: localize('logicAppNamePlaceHolder', 'Logic App name'),
      prompt: localize('logicAppNamePrompt', 'Enter a name for your Logic App'),
      validateInput: (input: string): string | undefined => this.validateLogicAppName(input),
    });
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private validateLogicAppName(name: string | undefined): string | undefined {
    if (!name || name.length === 0) {
      return localize('logicAppNameEmpty', 'Logic app name cannot be empty.');
    }

    if (!deployedLogicAppNameValidation.test(name)) {
      return localize(
        'logicAppNameInvalid',
        'Logic app name must start and end with an alphanumeric characters, can only contain alphanumeric characters and hyphens, and must be 2-64 characters long.'
      );
    }

    return undefined;
  }
}
