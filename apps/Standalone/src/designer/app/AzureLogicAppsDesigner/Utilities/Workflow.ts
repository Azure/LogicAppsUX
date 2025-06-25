import type { ConnectionAndAppSetting, ConnectionsData, ParametersData } from '../Models/Workflow';
import { isOpenApiSchemaVersion, type ConnectionReferences } from '@microsoft/logic-apps-designer';

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
    const agentConnections = connectionsData.agentConnections || {};

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

    const agentConnectorId = 'connectionProviders/agent';
    for (const connectionKey of Object.keys(agentConnections)) {
      references[connectionKey] = {
        connection: { id: `/${agentConnectorId}/connections/${connectionKey}` },
        connectionName: connectionKey, // updated to use connectionKey directly
        api: { id: `/${agentConnectorId}` },
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
    } catch {
      throw new Error('Failure in resolving connection parameterisation');
    }
  }
}

function replaceAllOccurrences(content: string, searchValue: string, value: any): string {
  let result = replaceIfFoundAndVerifyJson(content, `"${searchValue}"`, JSON.stringify(value));
  if (result) {
    return result;
  }

  result = replaceIfFoundAndVerifyJson(content, searchValue, `${value}`);
  if (result) {
    return result;
  }

  return content.replaceAll(searchValue, '');
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

export const getDataForConsumption = (data: any) => {
  const properties = data?.properties as any;

  const definition = removeProperties(properties?.definition, ['parameters']);
  const connections =
    (isOpenApiSchemaVersion(definition) ? properties?.connectionReferences : properties?.parameters?.$connections?.value) ?? {};

  const workflow = { definition, connections };
  const connectionReferences = formatConnectionReferencesForConsumption(connections);
  const parameters: ParametersData = formatWorkflowParametersForConsumption(properties);

  return { workflow, connectionReferences, parameters };
};

const removeProperties = (obj: any = {}, props: string[] = []): object => {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !props.includes(key)));
};

const formatConnectionReferencesForConsumption = (connectionReferences: Record<string, any>): any => {
  return Object.fromEntries(
    Object.entries(connectionReferences).map(([key, value]) => [key, formatConnectionReferenceForConsumption(value)])
  );
};

const formatConnectionReferenceForConsumption = (connectionReference: any): any => {
  const connectionReferenceCopy = { ...connectionReference };
  connectionReferenceCopy.connection = connectionReference.connection ?? { id: connectionReference.connectionId };
  delete connectionReferenceCopy.connectionId;
  connectionReferenceCopy.api = connectionReference.api ?? { id: connectionReference.id };
  delete connectionReferenceCopy.id;
  return connectionReferenceCopy;
};

const formatWorkflowParametersForConsumption = (properties: any): ParametersData => {
  const parameters = removeProperties(properties?.definition?.parameters, ['$connections']) as ParametersData;
  Object.entries(properties?.parameters ?? {}).forEach(([key, parameter]: [key: string, parameter: any]) => {
    if (parameters[key]) {
      parameters[key].value = parameter?.value;
    }
  });
  return parameters;
};
