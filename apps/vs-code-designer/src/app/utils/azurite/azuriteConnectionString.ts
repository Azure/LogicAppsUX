/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { azureWebJobsStorageKey, azuriteExtensionPrefix, localEmulatorConnectionString } from '../../../constants';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getLocalSettingsJson, isLocalSettingsEncrypted, setLocalAppSetting } from '../appSettings/localSettings';
import { getWorkspaceSetting } from '../vsCodeConfig/settings';
import type { IActionContext } from '@microsoft/vscode-azext-utils';
import { MismatchBehavior } from '@microsoft/vscode-extension-logic-apps';

const azuriteDevelopmentAccountName = 'devstoreaccount1';
const azuriteDevelopmentAccountKey = 'Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==';
const managedConnectionStringStatePrefix = 'managedAzuriteConnectionString';

const defaultAzuriteEndpoints = {
  blobHost: '127.0.0.1',
  blobPort: 10000,
  queueHost: '127.0.0.1',
  queuePort: 10001,
  tableHost: '127.0.0.1',
  tablePort: 10002,
  useHttps: false,
};

export interface AzuriteEndpointSettings {
  blobHost: string;
  blobPort: number;
  queueHost: string;
  queuePort: number;
  tableHost: string;
  tablePort: number;
  useHttps: boolean;
}

/**
 * Replaces the development-storage shorthand with explicit endpoints when the Azurite extension
 * is configured to use non-default hosts, ports, or HTTPS.
 */
export async function synchronizeAzuriteConnectionString(context: IActionContext, projectPath: string): Promise<void> {
  const localSettingsEncrypted = await isLocalSettingsEncrypted(projectPath);
  const localSettings = await getLocalSettingsJson(context, projectPath);
  const configuredStorage = localSettings.Values?.[azureWebJobsStorageKey];
  const managedConnectionStringStateKey = `${managedConnectionStringStatePrefix}:${projectPath}`;
  const managedConnectionString = ext.context.workspaceState.get<string>(managedConnectionStringStateKey);
  const isManagedConnectionString = managedConnectionString !== undefined && configuredStorage === managedConnectionString;
  if (!isDevelopmentStorageShortcut(configuredStorage) && !isManagedConnectionString) {
    return;
  }

  const endpointSettings = getAzuriteEndpointSettings(projectPath);
  const shouldUseExplicitEndpoints = isManagedConnectionString || !hasDefaultAzuriteEndpoints(endpointSettings);
  const updatedConnectionString = shouldUseExplicitEndpoints
    ? createAzuriteDevelopmentConnectionString(endpointSettings)
    : localEmulatorConnectionString;
  if (configuredStorage === updatedConnectionString) {
    return;
  }

  if (localSettingsEncrypted) {
    throw new Error(
      localize(
        'encryptedAzuriteConnectionString',
        '"{0}" must be updated to match the configured Azurite endpoints, but local.settings.json is encrypted. Decrypt local.settings.json and retry debugging so the storage endpoints can be updated safely.',
        azureWebJobsStorageKey
      )
    );
  }

  await setLocalAppSetting(context, projectPath, azureWebJobsStorageKey, updatedConnectionString, MismatchBehavior.Overwrite);
  await ext.context.workspaceState.update(
    managedConnectionStringStateKey,
    shouldUseExplicitEndpoints ? updatedConnectionString : undefined
  );

  context.telemetry.properties.azuriteConnectionStringUpdated = 'true';
  context.telemetry.properties.azuriteBlobPort = endpointSettings.blobPort.toString();
  context.telemetry.properties.azuriteQueuePort = endpointSettings.queuePort.toString();
  context.telemetry.properties.azuriteTablePort = endpointSettings.tablePort.toString();
  ext.outputChannel.appendLog(
    localize(
      'updatedAzuriteConnectionString',
      'Updated "{0}" in local.settings.json to use the configured Azurite service endpoints.',
      azureWebJobsStorageKey
    )
  );
}

export function createAzuriteDevelopmentConnectionString(settings: AzuriteEndpointSettings): string {
  const protocol = settings.useHttps ? 'https' : 'http';
  return [
    `DefaultEndpointsProtocol=${protocol}`,
    `AccountName=${azuriteDevelopmentAccountName}`,
    `AccountKey=${azuriteDevelopmentAccountKey}`,
    `BlobEndpoint=${protocol}://${formatEndpointHost(settings.blobHost)}:${settings.blobPort}/${azuriteDevelopmentAccountName}`,
    `QueueEndpoint=${protocol}://${formatEndpointHost(settings.queueHost)}:${settings.queuePort}/${azuriteDevelopmentAccountName}`,
    `TableEndpoint=${protocol}://${formatEndpointHost(settings.tableHost)}:${settings.tablePort}/${azuriteDevelopmentAccountName}`,
  ].join(';');
}

export function isAzuriteDevelopmentConnectionString(connectionString: string | undefined): boolean {
  if (isDevelopmentStorageShortcut(connectionString)) {
    return true;
  }
  if (!connectionString?.trim()) {
    return false;
  }

  const properties = parseConnectionString(connectionString);
  return (
    properties.get('accountname')?.toLowerCase() === azuriteDevelopmentAccountName &&
    properties.get('accountkey') === azuriteDevelopmentAccountKey
  );
}

function getAzuriteEndpointSettings(projectPath: string): AzuriteEndpointSettings {
  return {
    blobHost: getAzuriteHostSetting('blobHost', projectPath, defaultAzuriteEndpoints.blobHost),
    blobPort: getAzuritePortSetting('blobPort', projectPath, defaultAzuriteEndpoints.blobPort),
    queueHost: getAzuriteHostSetting('queueHost', projectPath, defaultAzuriteEndpoints.queueHost),
    queuePort: getAzuritePortSetting('queuePort', projectPath, defaultAzuriteEndpoints.queuePort),
    tableHost: getAzuriteHostSetting('tableHost', projectPath, defaultAzuriteEndpoints.tableHost),
    tablePort: getAzuritePortSetting('tablePort', projectPath, defaultAzuriteEndpoints.tablePort),
    useHttps: !!getWorkspaceSetting<string>('cert', projectPath, azuriteExtensionPrefix)?.trim(),
  };
}

function getAzuriteHostSetting(key: string, projectPath: string, defaultValue: string): string {
  return getWorkspaceSetting<string>(key, projectPath, azuriteExtensionPrefix)?.trim() || defaultValue;
}

function getAzuritePortSetting(key: string, projectPath: string, defaultValue: number): number {
  const configuredPort = getWorkspaceSetting<number>(key, projectPath, azuriteExtensionPrefix);
  if (configuredPort === undefined || !Number.isInteger(configuredPort) || configuredPort <= 0 || configuredPort > 65535) {
    return defaultValue;
  }
  return configuredPort;
}

function hasDefaultAzuriteEndpoints(settings: AzuriteEndpointSettings): boolean {
  return (
    settings.blobHost === defaultAzuriteEndpoints.blobHost &&
    settings.blobPort === defaultAzuriteEndpoints.blobPort &&
    settings.queueHost === defaultAzuriteEndpoints.queueHost &&
    settings.queuePort === defaultAzuriteEndpoints.queuePort &&
    settings.tableHost === defaultAzuriteEndpoints.tableHost &&
    settings.tablePort === defaultAzuriteEndpoints.tablePort &&
    settings.useHttps === defaultAzuriteEndpoints.useHttps
  );
}

function isDevelopmentStorageShortcut(connectionString: string | undefined): boolean {
  return connectionString?.trim().replace(/;+$/, '').toLowerCase() === localEmulatorConnectionString.toLowerCase();
}

function parseConnectionString(connectionString: string): Map<string, string> {
  const properties = new Map<string, string>();
  for (const segment of connectionString.split(';')) {
    const separatorIndex = segment.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    properties.set(segment.slice(0, separatorIndex).trim().toLowerCase(), segment.slice(separatorIndex + 1).trim());
  }
  return properties;
}

function formatEndpointHost(host: string): string {
  if (host === '0.0.0.0') {
    return '127.0.0.1';
  }
  if (host === '::') {
    return '[::1]';
  }
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host;
}
