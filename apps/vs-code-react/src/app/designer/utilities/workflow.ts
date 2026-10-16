import type { ConnectionReferences } from '@microsoft/logic-apps-designer';
import type { ConnectionsData } from '@microsoft/vscode-extension-logic-apps';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';

export const convertConnectionsDataToReferences = (connectionsData: ConnectionsData | undefined): ConnectionReferences => {
  const references: any = {};
  if (!connectionsData) {
    return references;
  }

  const apiManagementConnections = connectionsData.apiManagementConnections || {};
  const functionConnections = connectionsData.functionConnections || {};
  const connectionReferences = connectionsData.managedApiConnections || {};
  const serviceProviderConnections = connectionsData.serviceProviderConnections || {};
  const agentConnections = connectionsData.agentConnections || {};
  const agentMcpConnections = connectionsData.agentMcpConnections || {};

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

  const mcpConnectorId = 'connectionProviders/mcpclient';
  for (const connectionKey of Object.keys(agentMcpConnections)) {
    references[connectionKey] = {
      connection: { id: `/${mcpConnectorId}/connections/${connectionKey}` },
      connectionName: connectionKey,
      api: { id: mcpConnectorId },
    };
  }

  return references;
};

/**
 * Retrieves the name of the trigger from the workflow definition.
 * @param workflowJson - The workflow JSON containing the definition.
 * @returns The name of the trigger, or undefined if not found.
 */
export const getTriggerName = (workflowJson?: { definition: LogicAppsV2.WorkflowDefinition }): string | undefined => {
  const definition = workflowJson?.definition;
  if (!definition) {
    return undefined;
  }
  for (const trigger in definition?.triggers) {
    if (trigger) {
      return trigger;
    }
  }
  return undefined;
};

export const getCodeViewRequestOptionsValidationErrors = (definition: unknown): string[] => {
  const errors: string[] = [];
  visitActions(asRecord(definition)?.actions, errors);
  return errors;
};

const visitActions = (value: unknown, errors: string[]): void => {
  const actions = asRecord(value);
  if (!actions) {
    return;
  }
  for (const [name, value] of Object.entries(actions)) {
    const action = asRecord(value);
    if (!action) {
      continue;
    }
    const type = typeof action.type === 'string' ? action.type : undefined;
    const requestOptions = asRecord(asRecord(action.runtimeConfiguration)?.requestOptions);
    if (type && type.toLowerCase() !== 'http' && requestOptions && Object.hasOwn(requestOptions, 'timeout')) {
      errors.push(
        `The request options timeout parameter is not supported for action '${name}' of type '${type}'. Actions of type 'HTTP' are supported.`
      );
    }
    visitActions(action.actions, errors);
    visitActions(asRecord(action.else)?.actions, errors);
    visitActions(asRecord(action.default)?.actions, errors);
    const cases = asRecord(action.cases);
    if (cases) {
      for (const caseDefinition of Object.values(cases)) {
        visitActions(asRecord(caseDefinition)?.actions, errors);
      }
    }
    const tools = asRecord(action.tools);
    if (tools) {
      for (const toolDefinition of Object.values(tools)) {
        visitActions(asRecord(toolDefinition)?.actions, errors);
      }
    }
  }
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
