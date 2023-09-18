/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { SQLStringNameStep } from './SQLStringNameStep';
import type { IAppServiceWizardContext } from '@microsoft/vscode-azext-azureappservice';
import type { IWizardOptions } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension';
import { StorageOptions } from '@microsoft/vscode-extension';
import type { QuickPickItem, QuickPickOptions } from 'vscode';

export class AzureStorageAccountStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  private sqlStrorage: boolean;

  public async prompt(wizardContext: IAppServiceWizardContext): Promise<void> {
    const storagePicks: QuickPickItem[] = [{ label: localize('yes', 'Yes') }, { label: localize('no', 'No') }];

    const options: QuickPickOptions = { placeHolder: localize('selectStorageType', 'Do you want to use SQL storage for your Logic App?') };
    this.sqlStrorage = (await wizardContext.ui.showQuickPick(storagePicks, options)).label === 'Yes';
  }

  public shouldPrompt(wizardContext: ILogicAppWizardContext): boolean {
    return wizardContext.storageType === undefined;
  }

  public async getSubWizard(wizardContext: ILogicAppWizardContext): Promise<IWizardOptions<ILogicAppWizardContext> | undefined> {
    if (this.sqlStrorage) {
      wizardContext.storageType = StorageOptions.SQL;
      return {
        promptSteps: [new SQLStringNameStep()],
      };
    } else {
      wizardContext.storageType = StorageOptions.AzureStorage;
      return undefined;
    }
  }
}
