/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { SQLStringNameStep } from './SQLStringNameStep';
import { AppInsightsCreateStep, AppInsightsListStep } from '@microsoft/vscode-azext-azureappservice';
import {
  StorageAccountCreateStep,
  StorageAccountKind,
  StorageAccountListStep,
  StorageAccountPerformance,
  StorageAccountReplication,
} from '@microsoft/vscode-azext-azureutils';
import type { INewStorageAccountDefaults } from '@microsoft/vscode-azext-azureutils';
import type { IWizardOptions } from '@microsoft/vscode-azext-utils';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { StorageOptions } from '@microsoft/vscode-extension-logic-apps';
import type { QuickPickItem, QuickPickOptions } from 'vscode';

export class CustomLocationStorageAccountStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    const storagePicks: QuickPickItem[] = [{ label: StorageOptions.AzureStorage }, { label: StorageOptions.SQL }];

    const options: QuickPickOptions = { placeHolder: localize('selectStorageType', 'Select your preferred Storage Provider') };
    wizardContext.storageType = (await wizardContext.ui.showQuickPick(storagePicks, options)).label as StorageOptions;
  }

  public shouldPrompt(wizardContext: ILogicAppWizardContext): boolean {
    return wizardContext.useHybrid && wizardContext.storageType === undefined;
  }

  public async getSubWizard(wizardContext: ILogicAppWizardContext): Promise<IWizardOptions<ILogicAppWizardContext> | undefined> {
    if (wizardContext.useHybrid) {
      const { storageType } = wizardContext;
      const storageAccountCreateOptions: INewStorageAccountDefaults = {
        kind: StorageAccountKind.Storage,
        performance: StorageAccountPerformance.Standard,
        replication: StorageAccountReplication.LRS,
      };

      if (storageType === StorageOptions.AzureStorage) {
        if (!wizardContext.advancedCreation) {
          return {
            executeSteps: [new StorageAccountCreateStep(storageAccountCreateOptions), new AppInsightsCreateStep()],
          };
        }
        return {
          promptSteps: [
            new StorageAccountListStep(storageAccountCreateOptions, {
              kind: [StorageAccountKind.BlobStorage],
              performance: [StorageAccountPerformance.Premium],
              replication: [StorageAccountReplication.ZRS],
              learnMoreLink: 'https://aka.ms/Cfqnrc',
            }),
            new AppInsightsListStep(),
          ],
        };
      }
      return {
        promptSteps: [new SQLStringNameStep()],
      };
    }
  }
}
