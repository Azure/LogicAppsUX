/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';

export class SQLStringNameStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    wizardContext.sqlConnectionString = await wizardContext.ui.showInputBox({
      placeHolder: localize('sqlConnectionPlaceholder', 'SQL connection string'),
      prompt: localize('sqlConnectionPrompt', 'Provide your SQL connection string'),
      validateInput: async (connectionString: string): Promise<string | undefined> => await validateSQLConnectionString(connectionString),
    });
  }

  public shouldPrompt(context: ILogicAppWizardContext): boolean {
    return !context.sqlConnectionString;
  }
}

export async function validateSQLConnectionString(connectionString: string): Promise<string | undefined> {
  if (!connectionString) {
    return localize('emptySqlConnectionString', 'The SQL connection string value cannot be empty');
  }
  return undefined;
}
