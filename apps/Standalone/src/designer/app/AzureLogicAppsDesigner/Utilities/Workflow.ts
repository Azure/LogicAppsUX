import type { ConnectionAndAppSetting, ConnectionsData, ParametersData } from '../Models/Workflow';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';

export class WorkflowUtility {
  public static convertToCanonicalFormat(value: string): string {
    return value?.toLowerCase().replaceAll(' ', '');
  }

  public static convertConnectionsDataToReferences(connectionsData: ConnectionsData | undefined): ConnectionReferences {
    const references: any = {};
    if (!connectionsData) {
      return references;
    }

    const apiManagementConnections = connectionsData.apiManagementConnections || {};
    const functionConnections = connectionsData.functionConnections || {};
    const connectionReferences = connectionsData.managedApiConnections || {};
    const serviceProviderConnections = connectionsData.serviceProviderConnections || {};

    for (const connectionReferenceKey of Object.keys(connectionReferences)) {
      const { connection, api, connectionProperties, authentication } = connectionReferences[connectionReferenceKey];
      references[connectionReferenceKey] = {
        connection: { id: connection ? connection.id : '' },
        connectionName: connection && connection.id ? connection.id.split('/').slice(-1)[0] : '',
        api: { id: api ? api.id : '' },
        connectionProperties,
        authentication,
      };
    }

    const apimConnectorId = '/connectionProviders/apiManagementOperation';
    for (const connectionKey of Object.keys(apiManagementConnections)) {
      references[connectionKey] = {
        connection: { id: `${apimConnectorId}/connections/${connectionKey}` },
        connectionName: connectionKey,
        api: { id: apimConnectorId },
      };
    }

    const functionConnectorId = '/connectionProviders/azureFunctionOperation';
    for (const connectionKey of Object.keys(functionConnections)) {
      references[connectionKey] = {
        connection: { id: `${functionConnectorId}/connections/${connectionKey}` },
        connectionName: connectionKey,
        api: { id: functionConnectorId },
      };
    }

    for (const connectionKey of Object.keys(serviceProviderConnections)) {
      const serviceProviderId = serviceProviderConnections[connectionKey].serviceProvider.id;
      references[connectionKey] = {
        connection: { id: `${serviceProviderId}/connections/${connectionKey}` },
        connectionName: serviceProviderConnections[connectionKey].displayName ?? connectionKey,
        api: { id: serviceProviderId },
      };
    }

    return references;
  }

  public static resolveConnectionsReferences(
    content: string,
    parameters: ParametersData | undefined,
    appsettings?: Record<string, string> | undefined
  ): any {
    let result = content;

    if (parameters) {
      for (const parameterName of Object.keys(parameters)) {
        const parameterValue = parameters[parameterName].value !== undefined ? parameters[parameterName].value : '';
        result = replaceAllOccurrences(result, `@parameters('${parameterName}')`, parameterValue);
        result = replaceAllOccurrences(result, `@{parameters('${parameterName}')}`, parameterValue);
      }
    }

    if (appsettings) {
      for (const settingName of Object.keys(appsettings)) {
        const settingValue = appsettings[settingName] !== undefined ? appsettings[settingName] : '';
        // Don't replace if the setting value is a KeyVault reference
        if (typeof settingValue !== 'string' || settingValue.startsWith('@Microsoft.KeyVault(')) {
          continue;
        }
        result = replaceAllOccurrences(result, `@appsetting('${settingName}')`, settingValue);
        result = replaceAllOccurrences(result, `@{appsetting('${settingName}')}`, settingValue);
      }
    }

    try {
      return JSON.parse(result);
    } catch (error) {
      throw new Error('Failure in resolving connection parameterisation');
    }
  }
}

function replaceAllOccurrences(content: string, searchValue: string, value: any): string {
  while (content.includes(searchValue)) {
    const tempResult =
      replaceIfFoundAndVerifyJson(content, `"${searchValue}"`, JSON.stringify(value)) ??
      replaceIfFoundAndVerifyJson(content, searchValue, `${value}`) ??
      content.replace(searchValue, '');

    content = tempResult;
  }

  return content;
}

function replaceIfFoundAndVerifyJson(stringifiedJson: string, searchValue: string, value: string): string | undefined {
  if (!stringifiedJson.includes(searchValue)) {
    return undefined;
  }

  const result = stringifiedJson.replace(searchValue, () => {
    return value;
  });

  try {
    JSON.parse(result);
    return result;
  } catch {
    return undefined;
  }
}

export function addConnectionInJson(connectionAndSetting: ConnectionAndAppSetting, connectionsJson: ConnectionsData): void {
  const { connectionData, connectionKey, pathLocation } = connectionAndSetting;

  let pathToSetConnectionsData: any = connectionsJson;

  for (const path of pathLocation) {
    if (!pathToSetConnectionsData[path]) {
      pathToSetConnectionsData[path] = {};
    }

    pathToSetConnectionsData = pathToSetConnectionsData[path];
  }

  if (pathToSetConnectionsData && pathToSetConnectionsData[connectionKey]) {
    // TODO: To show this in a notification of info bar on the blade.
    // const message = 'ConnectionKeyAlreadyExist - Connection key \'{0}\' already exists.'.format(connectionKey);
    return;
  }

  pathToSetConnectionsData[connectionKey] = connectionData;
}

export function addOrUpdateAppSettings(settings: Record<string, string>, originalSettings: Record<string, string>): Record<string, string> {
  const settingsToAdd = Object.keys(settings);

  for (const settingKey of settingsToAdd) {
    if (originalSettings[settingKey]) {
      // TODO: To show this in a notification of info bar on the blade that key will be overriden.
    }

    // eslint-disable-next-line no-param-reassign
    originalSettings[settingKey] = settings[settingKey];
  }

  return originalSettings;
}
