/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { getLocalSettingsFile } from './getLocalSettingsFile';
import type { StringDictionary } from '@azure/arm-appservice';
import type { IAppSettingsClient } from '@microsoft/vscode-azext-azureappservice';
import { AppSettingsTreeItem, confirmOverwriteSettings } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import type { WorkspaceFolder } from 'vscode';

/**
 * Uploads local settings file to the portal.
 * @param {IActionContext} context - Command context.
 * @param {AppSettingsTreeItem} node - App settings node structure.
 * @param {WorkspaceFolder} workspacePath - Workspace folder path.
 * @param {string[]} settingsToExclude - Array of settings to exclude from uploading.
 * @returns {Promise<string>} Workspace file path.
 */
export async function uploadAppSettings(
  context: IActionContext,
  node?: AppSettingsTreeItem,
  workspacePath?: WorkspaceFolder,
  settingsToExclude: string[] = []
): Promise<void> {
  const message: string = localize('selectLocalSettings', 'Select the local settings file to upload.');
  const localSettingsPath: string = await getLocalSettingsFile(context, message, workspacePath);

  if (!node) {
    node = await ext.tree.showTreeItemPicker<AppSettingsTreeItem>(AppSettingsTreeItem.contextValue, context);
  }

  const client: IAppSettingsClient = await node.clientProvider.createClient(context);

  await node.runWithTemporaryDescription(context, localize('uploading', 'Uploading...'), async () => {
    ext.outputChannel.show(true);
    ext.outputChannel.appendLog(localize('uploadStart', 'Uploading settings to "{0}"...', client.fullName));
    const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

    if (localSettings.Values) {
      const remoteSettings: StringDictionary = await client.listApplicationSettings();
      if (!remoteSettings.properties) {
        remoteSettings.properties = {};
      }

      for (const settingToDelete of settingsToExclude) {
        delete localSettings.Values[settingToDelete];
      }

      await confirmOverwriteSettings(context, localSettings.Values, remoteSettings.properties, client.fullName);

      await client.updateApplicationSettings(remoteSettings);
    } else {
      throw new Error(localize('noSettings', 'No settings found in "{0}".', localSettingsFileName));
    }
  });
}
