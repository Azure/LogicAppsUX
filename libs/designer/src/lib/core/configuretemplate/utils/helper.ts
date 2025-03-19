import type { ConnectionsData, LogicAppsV2, Template } from '@microsoft/logic-apps-shared';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { getConnectionsMappingForNodes } from '../../actions/bjsworkflow/connections';

export const getTemplateConnectionsFromConnectionsData = (
  connectionsData: ConnectionsData | undefined
): Record<string, Template.Connection> => {
  let finalData: Record<string, Template.Connection> = {};
  if (!connectionsData) {
    return finalData;
  }

  const apiManagementConnections = connectionsData.apiManagementConnections || {};
  const functionConnections = connectionsData.functionConnections || {};
  const connectionReferences = connectionsData.managedApiConnections || {};
  const serviceProviderConnections = connectionsData.serviceProviderConnections || {};
  const agentConnections = connectionsData.agentConnections || {};

  finalData = {
    ...finalData,
    ...Object.keys(connectionReferences).reduce((result: Record<string, Template.Connection>, connectionReferenceKey) => {
      const { api } = connectionReferences[connectionReferenceKey];
      result[connectionReferenceKey] = {
        connectorId: api.id,
        kind: 'shared',
      };

      return result;
    }, {}),
  };

  finalData = {
    ...finalData,
    ...Object.keys(apiManagementConnections).reduce((result: Record<string, Template.Connection>, connectionReferenceKey) => {
      result[connectionReferenceKey] = {
        connectorId: '/connectionProviders/apiManagementOperation',
        kind: 'inapp',
      };

      return result;
    }, {}),
  };

  finalData = {
    ...finalData,
    ...Object.keys(functionConnections).reduce((result: Record<string, Template.Connection>, connectionReferenceKey) => {
      result[connectionReferenceKey] = {
        connectorId: '/connectionProviders/azureFunctionOperation',
        kind: 'inapp',
      };

      return result;
    }, {}),
  };

  finalData = {
    ...finalData,
    ...Object.keys(serviceProviderConnections).reduce((result: Record<string, Template.Connection>, connectionReferenceKey) => {
      result[connectionReferenceKey] = {
        connectorId: serviceProviderConnections[connectionReferenceKey].serviceProvider.id,
        kind: 'inapp',
      };

      return result;
    }, {}),
  };

  finalData = {
    ...finalData,
    ...Object.keys(agentConnections).reduce((result: Record<string, Template.Connection>, connectionReferenceKey) => {
      result[connectionReferenceKey] = {
        connectorId: 'connectionProviders/agent',
        kind: 'inapp',
      };

      return result;
    }, {}),
  };

  return finalData;
};

export const getLogicAppId = (subscriptionId: string, resourceGroup: string, logicAppName: string): string => {
  return `/subscriptions/${subscriptionId}/resourceGroups/${resourceGroup}/providers/Microsoft.Logic/workflows/${logicAppName}`.toLowerCase();
};

export const getConnectionKeysInDefinition = async (definition: LogicAppsV2.WorkflowDefinition): Promise<string[]> => {
  const workflow = Deserialize(definition, /* runInstance */ null);
  const mapping = await getConnectionsMappingForNodes(workflow);
  return Object.values(mapping);
};
