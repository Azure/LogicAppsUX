import type { ParametersData } from '../models/workflow';
import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';

export const convertConnectionsDataToReferences = (connectionsData: ConnectionsData | undefined): ConnectionReferences => {
  const references: any = {};
  if (!connectionsData) {
    return references;
  }

  const apiManagementConnections = connectionsData.apiManagementConnections || {};
  const functionConnections = connectionsData.functionConnections || {};
  const connectionReferences = connectionsData.managedApiConnections || {};
  const serviceProviderConnections = connectionsData.serviceProviderConnections || {};

  for (const connectionReferenceKey of Object.keys(connectionReferences)) {
    const { connection, api, authentication } = connectionReferences[connectionReferenceKey];
    references[connectionReferenceKey] = {
      connection: { id: connection ? connection.id : '' },
      connectionName: connection && connection.id ? connection.id.split('/').slice(-1)[0] : '',
      api: { id: api ? api.id : '' },
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
};

export const resolveConnectionsReferences = (
  content: string,
  parameters: ParametersData | undefined,
  appsettings?: Record<string, string> | undefined
): any => {
  let result = content;

  if (parameters) {
    for (const parameterName of Object.keys(parameters)) {
      const parameterValue = parameters[parameterName].value !== undefined ? parameters[parameterName].value : '';
      result = replaceAllOccurrences(result, `@parameters('${parameterName}')`, parameterValue);
    }
  }

  if (appsettings) {
    for (const settingName of Object.keys(appsettings)) {
      const settingValue = appsettings[settingName] !== undefined ? appsettings[settingName] : '';
      result = replaceAllOccurrences(result, `@appsetting('${settingName}')`, settingValue);
    }
  }

  try {
    return JSON.parse(result);
  } catch (error) {
    throw new Error('Failure in resolving connection parameterisation');
  }
};

function replaceAllOccurrences(content: string, searchValue: string, value: any): string {
  let currContent = content;
  while (currContent.includes(searchValue)) {
    const tempResult =
      replaceIfFoundAndVerifyJson(currContent, `"${searchValue}"`, JSON.stringify(value)) ??
      replaceIfFoundAndVerifyJson(currContent, searchValue, `${value}`) ??
      currContent.replace(searchValue, '');

    currContent = tempResult;
  }

  return currContent;
}

function replaceIfFoundAndVerifyJson(stringifiedJson: string, searchValue: string, value: string): string | undefined {
  if (!stringifiedJson.includes(searchValue)) {
    return undefined;
  }

  const result = stringifiedJson.replace(searchValue, value);
  try {
    JSON.parse(result);
    return result;
  } catch {
    return undefined;
  }
}
