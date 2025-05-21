import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';

export class StorageAccountNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.storageAccountName = await context.ui.showInputBox({
      placeHolder: localize('setStorageAccountName', 'Storage account name'),
      prompt: localize('storageAccountNamePrompt', 'Provide a unique name for the storage account.'),
      validateInput: (value: string): string | undefined => {
        if (!value || value.length === 0) {
          return localize('storageAccountNameEmpty', 'Storage account name cannot be empty.');
        }
        return undefined;
      },
    });
  }

  public shouldPrompt(): boolean {
    return true;
  }
}
