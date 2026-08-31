/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { localize } from '../../localize';
import { ext } from '../../extensionVariables';
import { getLocalSettingsJson } from '../utils/appSettings/localSettings';
import {
  azureWebJobsStorageKey,
  cloudSettingsFileName,
  ProjectDirectoryPathKey,
  webhookRedirectHostUri,
} from '../../constants';
import { isString } from '@microsoft/logic-apps-shared';
import { writeFormattedJson } from '../utils/fs';
import * as path from 'path';
import type * as vscode from 'vscode';
import { getConnectionsJson } from '../utils/codeless/connection';
import type { ConnectionsData } from '@microsoft/logic-apps-shared';
import type { ILocalSettingsJson } from '@microsoft/vscode-extension-logic-apps';
import { getParentLogicAppRoot, selectLogicAppRoot } from '../utils/workspace';

/**
 * Syncs the cloud.settings.json file with local.settings.json.
 * @param {IActionContext} context - The action context.
 * @param {vscode.Uri} node - The URI of the cloud.settings.json file or the logic app project to sync.
 * @returns {Promise<void>} - A promise that resolves when the sync is complete.
 */
export async function syncCloudSettings(context: IActionContext, node?: vscode.Uri): Promise<void> {
  const projectPath = node?.fsPath ? await getParentLogicAppRoot(node.fsPath) : await selectLogicAppRoot(context);
  if (!projectPath) {
    throw new Error(localize('LogicAppRootError', 'Unable to determine logic app project root.'));
  }

  const localSettings = await getLocalSettingsJson(context, projectPath, false);
  if (!localSettings) {
    throw new Error(localize('localSettingsNotFound', 'No local.settings.json found in logic app project "{0}".', projectPath));
  }

  // Exclude managed API connection keys from cloud settings
  // TODO: REMOTEDEBUGGINGVERSION should not be in local.settings.json
  const settingsToExclude: string[] = [webhookRedirectHostUri, azureWebJobsStorageKey, ProjectDirectoryPathKey, 'REMOTEDEBUGGINGVERSION'];
  const cloudSettingValues = {};
  const connectionsJson = await getConnectionsJson(projectPath);
  if (connectionsJson) {
    const connectionsData: ConnectionsData = JSON.parse(connectionsJson);
    if (connectionsData.managedApiConnections && Object.keys(connectionsData.managedApiConnections).length) {
      for (const referenceKey of Object.keys(connectionsData.managedApiConnections)) {
        settingsToExclude.push(`${referenceKey}-connectionKey`);
      }
    }
  }

  const excludedLocalAppSettings = [];
  Object.keys(localSettings.Values).forEach((settingName) => {
    const shouldExcludeSetting = settingsToExclude.some((exclusion) =>
      isString(exclusion) ? settingName.toLowerCase() === exclusion.toLowerCase() : settingName.match(new RegExp(exclusion, 'i'))
    );
    if (shouldExcludeSetting) {
      excludedLocalAppSettings.push(settingName);
    } else if (settingName.match(/_connectionString$/i)) {
      cloudSettingValues[settingName] = '';
    } else {
      cloudSettingValues[settingName] = localSettings.Values[settingName];
    }
  });
  if (excludedLocalAppSettings.length > 0) {
    ext.outputChannel.appendLog(
      localize('excludedSettings', 'Excluded the following settings from cloud app settings: {0}', excludedLocalAppSettings.join(', '))
    );
  }

  const cloudSettingsPath = path.join(projectPath, cloudSettingsFileName);
  const cloudSettings = {
    IsEncrypted: false,
    Values: cloudSettingValues,
  } as ILocalSettingsJson;
  await writeFormattedJson(cloudSettingsPath, cloudSettings);

  ext.outputChannel.appendLog(localize('syncCloudSettingsSucceeded', 'Successfully synced cloud app settings with local app settings.'));
}
