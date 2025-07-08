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
  return AgentUtils.isConnector(id) && AgentUtils.isDeploymentIdParameter(key);
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
  return agentConnector && parameter?.value?.[0]?.value === 'FoundryAgentService';
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

export const getFirstDeploymentModelName = async (connection: Connection): Promise<string> => {
  const deploymentModels = await getCognitiveServiceAccountDeploymentsForConnection(connection);
  return deploymentModels.length > 0 ? deploymentModels[0].name : '';
};

export const getDeploymentIdParameter = (state: RootState, nodeId: string): ParameterInfo | undefined => {
  const parameterGroups = state.operations.inputParameters[nodeId]?.parameterGroups;
  const defaultGroup = parameterGroups[ParameterGroupKeys.DEFAULT];

  // Find the parameter that holds the connection reference (named 'agentConnection' in metadata)
  return defaultGroup.parameters.find((param) => param.parameterKey === 'inputs.$.deploymentId');
};

export const getConnectionToAssign = (
  modelType: string,
  azureOpenAIConnections: Connection[],
  foundryConnections: Connection[]
): Connection | null => {
  const connections = modelType === 'AzureOpenAI' ? azureOpenAIConnections : foundryConnections;

  if (connections.length === 0) {
    return null;
  }

  return connections[0];
};
