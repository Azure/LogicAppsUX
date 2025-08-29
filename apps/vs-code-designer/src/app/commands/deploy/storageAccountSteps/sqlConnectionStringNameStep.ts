/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../localize';
import { AzureWizardPromptStep } from '@microsoft/vscode-azext-utils';
import type { ILogicAppWizardContext } from '@microsoft/vscode-extension-logic-apps';
import { validateSQLConnectionString } from '../../../utils/sql';

export class SQLConnectionStringNameStep extends AzureWizardPromptStep<ILogicAppWizardContext> {
  public shouldPrompt(context: ILogicAppWizardContext): boolean {
    return !context.sqlConnectionString;
  }

  public async prompt(wizardContext: ILogicAppWizardContext): Promise<void> {
    wizardContext.sqlConnectionString = await wizardContext.ui.showInputBox({
      placeHolder: localize('sqlConnectionPlaceholder', 'SQL connection string'),
      prompt: localize('sqlConnectionPrompt', 'Provide your SQL connection string'),
      password: true,
      validateInput: async (connectionString: string): Promise<string | undefined> => await validateSQLConnectionString(connectionString),
    });
  }
}
