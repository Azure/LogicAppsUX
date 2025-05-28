import { equals } from '@microsoft/logic-apps-shared';
import { isAgentConnector } from '../../../../../common/utilities/Utils';
import type { ParameterGroup } from '../../../../../core/state/operation/operationMetadataSlice';
import constants from '../../../../../common/constants';

export const isAgentConnectorAndDeploymentId = (key: string, id?: string): boolean => {
  return isAgentConnector(id) && equals(key, 'inputs.$.deploymentId', /*caseInsensitive*/ true);
};

export const isAcaSessionConnector = (key: string, id?: string): boolean => {
  return id === constants.CONNECTION_IDS.ACA_SESSION && equals(key, 'inputs.$.sessionPool', /*caseInsensitive*/ true);
};

export const isAgentConnectorAndAgentServiceModel = (
  connectorId: string,
  groupId: string,
  parameterGroups: Record<string, ParameterGroup>
) => {
  const agentConnector = isAgentConnector(connectorId ?? '');
  const parameterGroup = parameterGroups[groupId];
  const parameter = parameterGroup?.parameters?.find((param: any) => param.parameterKey === 'inputs.$.agentModelType');
  return agentConnector && parameter?.value?.[0]?.value === 'FoundryAgentService';
};
