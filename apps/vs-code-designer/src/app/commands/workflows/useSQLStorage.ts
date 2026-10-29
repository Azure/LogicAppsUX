/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sqlStorageConnectionStringKey } from '../../../constants';
import { localize } from '../../../localize';
import { addOrUpdateLocalAppSettings } from '../../utils/appSettings/localSettings';
import { selectLogicAppRoot, getParentLogicAppRoot } from '../../utils/workspace';
import { validateSQLConnectionString } from '../../utils/sql';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';

export async function useSQLStorage(context: IActionContext, target?: vscode.Uri) {
  const projectPath = target?.fsPath
    ? await getParentLogicAppRoot(target.fsPath)
    : await selectLogicAppRoot(context);

  if (!projectPath) {
    throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root folder.'));
  }

  const sqlConnectionString = await context.ui.showInputBox({
    placeHolder: localize('sqlConnectionStringPlaceholder', 'SQL connection string'),
    prompt: localize('sqlConnectionStringPrompt', 'Provide your SQL connection string'),
    validateInput: async (connectionString: string): Promise<string | undefined> => await validateSQLConnectionString(connectionString),
  });

  const valuesToUpdateInSettings: Record<string, string> = {};
  valuesToUpdateInSettings[sqlStorageConnectionStringKey] = sqlConnectionString;

  await addOrUpdateLocalAppSettings(context, projectPath, valuesToUpdateInSettings);
  ext.outputChannel.appendLog(localize('logicapp.sqlstorageupdate', 'Logic app project settings updated to use SQL storage.'));
}
