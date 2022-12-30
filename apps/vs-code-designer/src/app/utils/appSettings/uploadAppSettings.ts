/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { decryptLocalSettings } from './decryptLocalSettings';
import { encryptLocalSettings } from './encryptLocalSettings';
import { getLocalSettingsFile } from './getLocalSettingsFile';
import type { StringDictionary } from '@azure/arm-appservice';
import type { IAppSettingsClient } from '@microsoft/vscode-azext-azureappservice';
import { AppSettingsTreeItem, confirmOverwriteSettings } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension';
import * as fse from 'fs-extra';
import * as vscode from 'vscode';

/**
 * Uploads local settings file to the portal.
 * @param {IActionContext} context - Command context.
 * @param {AppSettingsTreeItem} node - App settings node structure.
 * @param {vscode.WorkspaceFolder} workspacePath - Workspace folder path.
 * @param {string[]} settingsToExclude - Array of settings to exclude from uploading.
 * @returns {Promise<string>} Workspace file path.
 */
export async function uploadAppSettings(
  context: IActionContext,
  node?: AppSettingsTreeItem,
  workspacePath?: vscode.WorkspaceFolder,
  settingsToExclude: string[] = []
): Promise<void> {
  const message: string = localize('selectLocalSettings', 'Select the local settings file to upload.');
  const localSettingsPath: string = await getLocalSettingsFile(context, message, workspacePath);
  const localSettingsUri: vscode.Uri = vscode.Uri.file(localSettingsPath);

  if (!node) {
    node = await ext.tree.showTreeItemPicker<AppSettingsTreeItem>(AppSettingsTreeItem.contextValue, context);
  }

  const client: IAppSettingsClient = await node.clientProvider.createClient(context);

  await node.runWithTemporaryDescription(context, localize('uploading', 'Uploading...'), async () => {
    ext.outputChannel.show(true);
    ext.outputChannel.appendLog(localize('uploadStart', 'Uploading settings to "{0}"...', client.fullName));
    let localSettings: ILocalSettingsJson = (await fse.readJson(localSettingsPath)) as ILocalSettingsJson;
    if (localSettings.IsEncrypted) {
      await decryptLocalSettings(context, localSettingsUri);
      try {
        localSettings = (await fse.readJson(localSettingsPath)) as ILocalSettingsJson;
      } finally {
        await encryptLocalSettings(context, localSettingsUri);
      }
    }

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
