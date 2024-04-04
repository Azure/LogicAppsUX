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
import type { IFunctionAppWizardContext, ICreateLogicAppContext } from '@microsoft/vscode-extension-logic-apps';
import { StorageOptions } from '@microsoft/vscode-extension-logic-apps';
import type { QuickPickItem, QuickPickOptions } from 'vscode';

export class CustomLocationStorageAccountStep extends AzureWizardPromptStep<IFunctionAppWizardContext> {
  private readonly context: ICreateLogicAppContext;

  public constructor(context: ICreateLogicAppContext) {
    super();
    this.context = context;
  }

  public async prompt(wizardContext: IFunctionAppWizardContext): Promise<void> {
    const storagePicks: QuickPickItem[] = [{ label: StorageOptions.AzureStorage }, { label: StorageOptions.SQL }];

    const options: QuickPickOptions = { placeHolder: localize('selectStorageType', 'Select your preferred Storage Provider') };
    wizardContext.storageType = (await wizardContext.ui.showQuickPick(storagePicks, options)).label as StorageOptions;
  }

  public shouldPrompt(wizardContext: IFunctionAppWizardContext): boolean {
    return wizardContext.storageType === undefined;
  }

  public async getSubWizard(wizardContext: IFunctionAppWizardContext): Promise<IWizardOptions<IFunctionAppWizardContext> | undefined> {
    const { storageType } = wizardContext;
    const storageAccountCreateOptions: INewStorageAccountDefaults = {
      kind: StorageAccountKind.Storage,
      performance: StorageAccountPerformance.Standard,
      replication: StorageAccountReplication.LRS,
    };

    if (storageType === StorageOptions.AzureStorage) {
      if (!this.context.advancedCreation) {
        return {
          executeSteps: [new StorageAccountCreateStep(storageAccountCreateOptions), new AppInsightsCreateStep()],
        };
      } else {
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
    } else {
      return {
        promptSteps: [new SQLStringNameStep()],
      };
    }
  }
}
