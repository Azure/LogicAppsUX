/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import type { SiteLogsConfig } from '@azure/arm-appservice';
import type { SiteClient } from '@microsoft/vscode-azext-azureappservice';

export async function enableFileLogging(client: SiteClient, logsConfig?: SiteLogsConfig): Promise<void> {
  logsConfig = logsConfig || (await client.getLogsConfig());

  logsConfig.applicationLogs = logsConfig.applicationLogs || {};
  logsConfig.applicationLogs.fileSystem = logsConfig.applicationLogs.fileSystem || {};
  logsConfig.applicationLogs.fileSystem.level = 'Information';
  logsConfig.applicationLogs.azureBlobStorage = undefined;
  logsConfig.applicationLogs.azureTableStorage = undefined;

  await client.updateLogsConfig(logsConfig);
}
