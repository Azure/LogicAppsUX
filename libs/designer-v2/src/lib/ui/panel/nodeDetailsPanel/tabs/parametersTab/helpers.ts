import type { Connection, ParameterInfo } from '@microsoft/logic-apps-shared';
import { foundryServiceConnectionRegex } from '@microsoft/logic-apps-shared';
import { AgentUtils } from '../../../../../common/utilities/Utils';
import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';
import { getCognitiveServiceAccountDeploymentsForConnection } from '../../../connectionsPanel/createConnection/custom/useCognitiveService';
import type { RootState } from '../../../../../core';
import { ParameterGroupKeys } from '../../../../../core/utils/parameters/helper';

interface CategorizedConnections {
  azureOpenAI: Connection[];
  foundry: Connection[];
}

export const agentModelTypeParameterKey = 'inputs.$.agentModelType';

export const isAgentConnectorAndDeploymentId = (id: string, key: string): boolean => {
  return AgentUtils.isConnector(id) && AgentUtils.isDeploymentOrModelIdParameter(key);
};

export const isAgentConnectorAndFoundryAgentName = (id: string, key: string): boolean => {
  return AgentUtils.isConnector(id) && AgentUtils.isFoundryAgentNameParameter(key);
};

export const isAgentConnectorAndAgentModel = (id: string, key: string): boolean => {
  return AgentUtils.isConnector(id) && AgentUtils.isAgentModelTypeParameter(key);
};

export const isAgentConnectorAndAgentServiceModel = (
  connectorId: string,
  groupId: string,
  parameterGroups: Record<string, ParameterGroup>
) => {
  const agentConnector = AgentUtils.isConnector(connectorId ?? '');
  const parameterGroup = parameterGroups[groupId];
  const parameter = parameterGroup?.parameters?.find((param: any) => param.parameterKey === agentModelTypeParameterKey);
  return agentConnector && parameter?.value?.[0]?.value === 'FoundryAgentServiceV2';
};

export const categorizeConnections = (connections: Connection[]): CategorizedConnections => {
  return connections.reduce<CategorizedConnections>(
    (acc, connection) => {
      const cognitiveServiceId = connection.properties?.connectionParameters?.cognitiveServiceAccountId?.metadata?.value ?? '';

      if (foundryServiceConnectionRegex.test(cognitiveServiceId)) {
        acc.foundry.push(connection);
      } else {
        acc.azureOpenAI.push(connection);
      }

      return acc;
    },
    { azureOpenAI: [], foundry: [] }
  );
};

export interface FirstDeploymentInfo {
  deploymentName: string;
  modelName: string;
  modelFormat?: string;
  modelVersion?: string;
}

export const getFirstDeploymentInfo = async (connection: Connection): Promise<FirstDeploymentInfo | undefined> => {
  const deploymentModels = await getCognitiveServiceAccountDeploymentsForConnection(connection);
  if (deploymentModels.length === 0) {
    return undefined;
  }
  const first = deploymentModels[0];
  return {
    deploymentName: first.name ?? '',
    modelName: first.properties?.model?.name ?? '',
    modelFormat: first.properties?.model?.format,
    modelVersion: first.properties?.model?.version,
  };
};

export const getFirstDeploymentModelName = async (connection: Connection): Promise<string> => {
  const info = await getFirstDeploymentInfo(connection);
  return info?.deploymentName ?? '';
};

export const getDeploymentIdParameter = (state: RootState, nodeId: string): ParameterInfo | undefined => {
  const parameterGroups = state.operations.inputParameters[nodeId]?.parameterGroups;
  const defaultGroup = parameterGroups[ParameterGroupKeys.DEFAULT];

  // Find either deploymentId (for Azure OpenAI/Foundry/APIM) or modelId (for V1ChatCompletionsService)
  return (
    defaultGroup.parameters.find((param) => param.parameterKey === 'inputs.$.deploymentId') ||
    defaultGroup.parameters.find((param) => param.parameterKey === 'inputs.$.modelId')
  );
};

export const getConnectionToAssign = (
  modelType: string,
  azureOpenAIConnections: Connection[],
  foundryConnections: Connection[]
): Connection | null => {
  const connections = modelType === 'AzureOpenAI' || modelType === 'MicrosoftFoundry' ? azureOpenAIConnections : foundryConnections;

  if (connections.length === 0) {
    return null;
  }

  return connections[0];
};
