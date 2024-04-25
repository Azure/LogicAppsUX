/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sqlStorageConnectionStringKey } from '../../../constants';
import { localize } from '../../../localize';
import { addOrUpdateLocalAppSettings } from '../../utils/appSettings/localSettings';
import { getLogicAppProjectRoot } from '../../utils/codeless/connection';
import { getLocalSettingsFile } from '../appSettings/getLocalSettingsFile';
import { validateSQLConnectionString } from '../deploy/storageAccountSteps/SQLStringNameStep';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export async function useSQLStorage(context: IActionContext) {
  const sqlConnectionString = await context.ui.showInputBox({
    placeHolder: localize('sqlConnectionStringPlaceholder', 'SQL connection string'),
    prompt: localize('sqlConnectionStringPrompt', 'Provide your SQL connection string'),
    validateInput: async (connectionString: string): Promise<string | undefined> => await validateSQLConnectionString(connectionString),
  });

  const message: string = localize('selectLocalSettings', 'Select your local settings file.');
  const localSettingsFile: string = await getLocalSettingsFile(context, message);
  const projectPath = await getLogicAppProjectRoot(context, localSettingsFile);

  if (!projectPath) {
    throw new Error(localize('FunctionRootFolderError', 'Unable to determine logic app project root folder.'));
  }

  const valuesToUpdateInSettings: Record<string, string> = {};
  valuesToUpdateInSettings[sqlStorageConnectionStringKey] = sqlConnectionString;

  await addOrUpdateLocalAppSettings(context, projectPath, valuesToUpdateInSettings);
  await vscode.window.showInformationMessage(
    localize('logicapp.sqlstorageupdate', 'The logic app project settings are updated to use SQL storage.')
  );
}
