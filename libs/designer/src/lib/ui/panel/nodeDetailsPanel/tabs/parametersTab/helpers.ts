import { AgentUtils } from '../../../../../common/utilities/Utils';
import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';

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
