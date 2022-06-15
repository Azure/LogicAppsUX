/* eslint-disable no-param-reassign */
import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { Connector, OperationInfo, OperationManifest } from '@microsoft-logic-apps/utils';

export const getOperationInfo = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition
): Promise<OperationInfo> => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();

  nodeId = nodeId.toLowerCase();
  return queryClient.fetchQuery<OperationInfo>(['operationIds', { nodeId }], () =>
    // this is sync
    operationManifestService.getOperationInfo(operation)
  );
};

export const getConnector = async (connectorId: string): Promise<Connector> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  if (!connectorId) {
    throw new Error('ConnectorId must be defined');
  }
  connectorId = connectorId.toLowerCase();
  return queryClient.fetchQuery(['connector', { connectorId }], () => connectionService.getConnector(connectorId));
};

export const getOperationManifest = async ({ connectorId, operationId }: OperationInfo): Promise<OperationManifest> => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  if (!connectorId || !operationId) {
    throw new Error('OperationId and ConnectorId must be defined');
  }
  connectorId = connectorId.toLowerCase();
  operationId = operationId.toLowerCase();
  return queryClient.fetchQuery(['manifest', { connectorId }, { operationId }], () =>
    operationManifestService.getOperationManifest(connectorId, operationId)
  );
};

export const getOperationManifestForNode = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition
): Promise<OperationManifest> => {
  const operationInfo = await getOperationInfo(nodeId, operation);
  return getOperationManifest(operationInfo);
};
