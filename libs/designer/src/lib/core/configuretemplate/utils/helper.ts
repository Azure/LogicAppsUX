import type { ConnectionsData, Expression, LogicAppsV2, Template } from '@microsoft/logic-apps-shared';
import { Deserialize } from '../../parsers/BJSWorkflow/BJSDeserializer';
import { getConnectionsMappingForNodes } from '../../actions/bjsworkflow/connections';
import type { WorkflowTemplateData } from '../../actions/bjsworkflow/templates';
import type { OperationDetails } from '../../templates/utils/parametershelper';
import { initializeOperationDetails } from '../../templates/utils/parametershelper';
import { isRootNodeInGraph } from '../../utils/graph';
import type { NodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import type { ConnectionReferences } from '../../../common/models/workflow';
import type { Token, ValueSegment } from '@microsoft/designer-ui';
import { isExpressionToken, isParameterToken, isTokenValueSegment } from '../../utils/parameters/segment';
import { isArmResourceId, isFunction, isParameterExpression, LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';

export const delimiter = '::::::';
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

export const getConnectionMappingInDefinition = async (
  definition: LogicAppsV2.WorkflowDefinition,
  workflowId: string
): Promise<Record<string, string>> => {
  try {
    const workflow = Deserialize(definition, /* runInstance */ null);
    const mapping = await getConnectionsMappingForNodes(workflow);
    return Object.keys(mapping).reduce((result: Record<string, string>, operationId: string) => {
      result[`${workflowId}${delimiter}${operationId}`] = mapping[operationId];
      return result;
    }, {});
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'ConfigureTemplate.getConnnectionMappingInDefinition',
      error,
      message: `Error while getting connection mapping in definition: ${error}`,
    });
    return {};
  }
};

export const getOperationDataInDefinitions = async (
  workflows: Record<string, WorkflowTemplateData>,
  connections: Record<string, Template.Connection>
): Promise<NodeOperationInputsData[]> => {
  const promises: Promise<OperationDetails | undefined>[] = [];
  const references = getReferencesFromConnections(connections);
  for (const { id, workflowDefinition } of Object.values(workflows)) {
    const deserializedWorkflow = Deserialize(workflowDefinition, /* runInstance */ null);
    const { actionData: operations, nodesMetadata } = deserializedWorkflow;

    for (const operationId of Object.keys(operations)) {
      const isTrigger = isRootNodeInGraph(operationId, 'root', nodesMetadata);
      const operation = operations[operationId];
      const nodeId = `${id.toLowerCase()}${delimiter}${operationId}`;
      promises.push(initializeOperationDetails(nodeId, operation, /* connectorId */ undefined, isTrigger, [], references));
    }
  }

  const allNodeData = (await Promise.all(promises)).filter((data) => !!data) as OperationDetails[];
  return allNodeData.map(({ id, nodeInputs, nodeOperationInfo, inputDependencies }: OperationDetails) => ({
    id,
    nodeInputs,
    nodeDependencies: { inputs: inputDependencies, outputs: {} },
    operationInfo: nodeOperationInfo,
  }));
};

const getReferencesFromConnections = (connections: Record<string, Template.Connection>): ConnectionReferences => {
  return Object.keys(connections).reduce((result: ConnectionReferences, connectionKey) => {
    result[connectionKey] = { api: { id: connections[connectionKey].connectorId }, connection: { id: '' } };
    return result;
  }, {});
};

export const getParameterReferencesFromValue = (segments: ValueSegment[]): string[] => {
  const tokenSegments = segments.filter(isTokenValueSegment);
  const result: string[] = [];

  for (const segment of tokenSegments) {
    const token = segment.token as Token;
    if (isParameterToken(token)) {
      const name = token.name as string;
      if (!result.includes(name)) {
        result.push(name);
      }
    } else if (isExpressionToken(token)) {
      findParameterExpressions(token.expression as Expression, result);
    }
  }

  return result;
};

const findParameterExpressions = (expression: Expression, result: string[]): void => {
  if (!isFunction(expression)) {
    return;
  }

  if (isParameterExpression(expression.name)) {
    const name = (expression.arguments[0] as any).value as string;
    if (!result.includes(name)) {
      result.push(name);
    }
  }

  for (const arg of expression.arguments) {
    findParameterExpressions(arg, result);
  }
};

export const getConnectorKind = (connectorId: string): Template.FeaturedConnectorType => {
  return isArmResourceId(connectorId) ? 'shared' : connectorId.startsWith('/serviceproviders') ? 'inapp' : 'builtin';
};
