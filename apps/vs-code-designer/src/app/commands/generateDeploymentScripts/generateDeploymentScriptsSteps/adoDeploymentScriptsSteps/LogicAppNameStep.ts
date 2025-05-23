import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';

export class LogicAppNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.logicAppName = await context.ui.showInputBox({
      placeHolder: localize('setLogicAppName', 'Logic app name'),
      prompt: localize('logicAppNamePrompt', 'Provide a unique name for the logic app.'),
      validateInput: (value: string): string | undefined => {
        if (!value || value.length === 0) {
          return localize('logicAppNameEmpty', 'Logic app name cannot be empty.');
        }
        return undefined;
      },
    });
  }

  public shouldPrompt(): boolean {
    return true;
  }
}
