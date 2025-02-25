/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { sqlStorageConnectionStringKey } from '../../../constants';
import { localize } from '../../../localize';
import { addOrUpdateLocalAppSettings } from '../../utils/appSettings/localSettings';
import { getLogicAppProjectRoot } from '../../utils/codeless/connection';
import { tryGetLogicAppProjectRoot } from '../../utils/verifyIsProject';
import { getWorkspaceFolder } from '../../utils/workspace';
import { validateSQLConnectionString } from '../deploy/storageAccountSteps/SQLStringNameStep';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';

export async function useSQLStorage(context: IActionContext, target: vscode.Uri) {
  if (target === undefined || Object.keys(target).length === 0) {
    const workspaceFolder = await getWorkspaceFolder(context);
    const projectPath = await tryGetLogicAppProjectRoot(context, workspaceFolder);
    target = vscode.Uri.file(projectPath);
  }
  const sqlConnectionString = await context.ui.showInputBox({
    placeHolder: localize('sqlConnectionStringPlaceholder', 'SQL connection string'),
    prompt: localize('sqlConnectionStringPrompt', 'Provide your SQL connection string'),
    validateInput: async (connectionString: string): Promise<string | undefined> => await validateSQLConnectionString(connectionString),
  });

  const projectPath = await getLogicAppProjectRoot(context, target.fsPath);

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
