/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localSettingsFileName, logicAppFilter } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getLocalSettingsJson } from '../../utils/appSettings/localSettings';
import { getLocalSettingsFile } from './getLocalSettingsFile';
import type { StringDictionary } from '@azure/arm-appservice';
import { isString } from '@microsoft/logic-apps-shared';
import { AppSettingsTreeItem, confirmOverwriteSettings } from '@microsoft/vscode-azext-azureappservice';
import type { IAppSettingsClient } from '@microsoft/vscode-azext-azureappservice';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import * as vscode from 'vscode';

/**
 * Uploads local settings file to the portal.
 * @param {IActionContext} context - Command context.
 * @param {AppSettingsTreeItem} node - App settings node structure.
 * @param {[]} _nodes - App settings node structure.
 * @param {vscode.WorkspaceFolder} workspacePath - Workspace folder path.
 * @param {(RegExp | string)[]} exclude - Array of settings to exclude from uploading.
 * @returns {Promise<string>} Workspace file path.
 */
export async function uploadAppSettings(
  context: IActionContext,
  node?: AppSettingsTreeItem,
  _nodes?: [],
  workspacePath?: vscode.WorkspaceFolder,
  exclude?: (RegExp | string)[]
): Promise<void> {
  const message: string = localize('selectLocalSettings', 'Select the local settings file to upload.');
  const localSettingsPath: string = await getLocalSettingsFile(context, message, workspacePath);

  if (!node) {
    node = await ext.rgApi.pickAppResource<AppSettingsTreeItem>(context, {
      filter: logicAppFilter,
      expectedChildContextValue: new RegExp(AppSettingsTreeItem.contextValue),
    });
  }

  const client: IAppSettingsClient = await node.clientProvider.createClient(context);

  await node.runWithTemporaryDescription(context, localize('uploading', 'Uploading...'), async () => {
    ext.outputChannel.show(true);
    const localSettings: ILocalSettingsJson = await getLocalSettingsJson(context, localSettingsPath);

    if (localSettings.Values) {
      const remoteSettings: StringDictionary = await client.listApplicationSettings();
      const excludedAppSettings: string[] = [];

      if (!remoteSettings.properties) {
        remoteSettings.properties = {};
      }

      if (exclude) {
        Object.keys(localSettings.Values).forEach((settingName) => {
          if (
            exclude.some((exclusion) =>
              isString(exclusion) ? settingName.toLowerCase() === exclusion.toLowerCase() : settingName.match(new RegExp(exclusion, 'i'))
            )
          ) {
            delete localSettings.Values?.[settingName];
            excludedAppSettings.push(settingName);
          }
        });
      }

      ext.outputChannel.appendLog(localize('uploadingSettings', 'Uploading settings...'), { resourceName: client.fullName });
      await confirmOverwriteSettings(context, localSettings.Values, remoteSettings.properties, client.fullName);

      if (excludedAppSettings.length) {
        ext.outputChannel.appendLog(localize('excludedSettings', 'Excluded the following settings:'));
        excludedAppSettings.forEach((key) => ext.outputChannel.appendLine(`- ${key}`));
      }

      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: localize('uploadingSettingsTo', 'Uploading settings to "{0}"...', client.fullName),
        },
        async () => {
          await client.updateApplicationSettings(remoteSettings);
        }
      );

      ext.outputChannel.appendLog(localize('uploadedSettings', 'Successfully uploaded settings.'), { resourceName: client.fullName });
    } else {
      throw new Error(localize('noSettings', 'No settings found in "{0}".', localSettingsFileName));
    }
  });
}
