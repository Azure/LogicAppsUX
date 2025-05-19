import { equals } from '@microsoft/logic-apps-shared';
import { isAgentConnector } from '../../../../../common/utilities/Utils';
import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';

export const isAgentConnectorAndDeploymentId = (id: string, key: string): boolean => {
  return isAgentConnector(id) && equals(key, 'inputs.$.deploymentId', true);
};

export const isAgentConnectorAndAgentServiceModel = (
  connectorId: string,
  groupId: string,
  parameterGroups: Record<string, ParameterGroup>
) => {
  const agentConnector = isAgentConnector(connectorId ?? '');
  const parameterGroup = parameterGroups[groupId];
  const parameter = parameterGroup?.parameters?.find((param: any) => param.parameterKey === 'inputs.$.agentModelType');
  return agentConnector && parameter?.value?.[0]?.value === 'AgentService';
};
