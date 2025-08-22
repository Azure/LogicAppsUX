import {
  getBrandColorFromConnector,
  getIconUriFromConnector,
  getPropertyValue,
  hasProperty,
  LogEntryLevel,
  LoggerService,
  type ParameterInfo,
  type ConnectionReferences,
  type ConnectionsData,
} from '@microsoft/logic-apps-shared';
import { getConnectorWithSwagger } from '../../queries/connections';
import type { DependencyInfo, NodeInputs, NodeOperation, NodeOperationInputsData } from '../../state/operation/operationMetadataSlice';
import { getInputParametersFromSwagger, getOutputParametersFromSwagger } from '../../utils/swagger/operation';
import { getOperationSettings } from '../../actions/bjsworkflow/settings';
import { WorkflowKind } from '../../state/workflow/workflowInterfaces';
import { addDefaultSecureSettings } from '../../actions/bjsworkflow/add';
import { getParameterFromId, parameterHasValue } from '../../utils/parameters/helper';

const workflowKind = WorkflowKind.STATEFUL;

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
};

export const initializeOperationDetails = async (
  nodeId: string,
  operationInfo: NodeOperation,
  area: string
): Promise<NodeOperationInputsData | undefined> => {
  try {
    const { connector, parsedSwagger } = await getConnectorWithSwagger(operationInfo.connectorId);
    const iconUri = getIconUriFromConnector(connector);
    const brandColor = getBrandColorFromConnector(connector);
    const swaggerOperation = parsedSwagger.getOperationByOperationId(operationInfo.operationId);
    const { inputs: nodeInputs, dependencies: inputDependencies } = getInputParametersFromSwagger(
      nodeId,
      /* isTrigger */ false,
      parsedSwagger,
      operationInfo,
      /* stepDefinition */ undefined,
      /* loadDefaultValues */ false
    );
    const { outputs: nodeOutputs, dependencies: outputDependencies } = getOutputParametersFromSwagger(
      /* isTrigger */ false,
      parsedSwagger,
      operationInfo,
      nodeInputs
    );

    let settings = getOperationSettings(
      /* isTrigger */ false,
      operationInfo,
      /* manifest */ undefined,
      parsedSwagger,
      /* operation */ undefined,
      workflowKind
    );

    settings = addDefaultSecureSettings(settings, connector?.properties?.isSecureByDefault ?? false);

    return {
      id: nodeId,
      nodeInputs,
      nodeOutputs,
      operationInfo,
      nodeDependencies: { inputs: inputDependencies, outputs: outputDependencies },
      settings,
      operationMetadata: {
        iconUri,
        brandColor,
        description: getPropertyValue(swaggerOperation, 'description'),
        summary: getPropertyValue(swaggerOperation, 'summary'),
      },
    };
  } catch (error: any) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: `MCP.${area}`,
      message: `Error while initializing operation details for connectorId: ${operationInfo.connectorId}, operationId: ${nodeId}`,
      error: error instanceof Error ? error : undefined,
    });
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Operation: "${nodeId}", Error: "${errorMessage}".`);
  }
};

export const operationHasEmptyStaticDependencies = (nodeInputs: NodeInputs, dependencies: Record<string, DependencyInfo>): boolean => {
  const staticDependencies = getDynamicSchemaDependencies(dependencies);
  return staticDependencies.some((dependency) => {
    const dependentParameters = dependency.dependentParameters;
    return Object.keys(dependentParameters).some((parameterId) => {
      const parameter = getParameterFromId(nodeInputs, parameterId);
      return parameter && parameter.required && !parameterHasValue(parameter);
    });
  });
};

export const isDependentStaticParameter = (parameter: ParameterInfo, dependencies: Record<string, DependencyInfo>): boolean => {
  const isDependentParameter = getDynamicSchemaDependencies(dependencies).some((dependency) =>
    hasProperty(dependency.dependentParameters, parameter.id)
  );
  return isDependentParameter && parameter.required;
};

export const getUnsupportedOperations = (nodeOperations: NodeOperationInputsData[]): string[] => {
  const unsupportedOperations: string[] = [];
  for (const nodeOperation of nodeOperations) {
    const {
      id,
      nodeDependencies: { inputs },
      operationMetadata,
    } = nodeOperation;
    if (Object.values(inputs ?? {}).some((input) => input.dependencyType === 'ApiSchema')) {
      unsupportedOperations.push(operationMetadata?.summary ?? id);
    }
  }

  return unsupportedOperations;
};

const getDynamicSchemaDependencies = (dependencies: Record<string, DependencyInfo>): DependencyInfo[] => {
  return Object.values(dependencies).filter((dependency) => dependency.dependencyType === 'ApiSchema');
};
