import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { IAzureDeploymentScriptsContext } from '../../generateDeploymentScripts';
import { localize } from '../../../../../localize';
import { deployedStorageAccountNameValidation } from '../../../../../constants';

export class StorageAccountNameStep extends AzureWizardPromptStep<IAzureDeploymentScriptsContext> {
  public hideStepCount = true;

  public async prompt(context: IAzureDeploymentScriptsContext): Promise<void> {
    context.telemetry.properties.lastStep = 'StorageAccountNameStep';
    context.storageAccountName = await context.ui.showInputBox({
      placeHolder: localize('setStorageAccountName', 'Storage account name'),
      prompt: localize('storageAccountNamePrompt', 'Provide a unique name for the storage account.'),
      validateInput: (input: string): string | undefined => this.validateStorageAccountName(input),
    });
  }

  public shouldPrompt(): boolean {
    return true;
  }

  private validateStorageAccountName(name: string | undefined): string | undefined {
    if (!name || name.length === 0) {
      return localize('storageAccountNameEmpty', 'Storage account name cannot be empty.');
    }

    if (!deployedStorageAccountNameValidation.test(name)) {
      return localize(
        'storageAccountNameInvalid',
        'Storage account name can only contain lowercase letters and numbers and must be 3-24 characters long.'
      );
    }

    return undefined;
  }
}
