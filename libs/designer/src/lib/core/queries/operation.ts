/* eslint-disable no-param-reassign */
import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService, OperationManifestService } from '@microsoft/logic-apps-shared';
import type { Connector, LogicAppsV2, OpenAPIV2, OperationInfo, OperationManifest } from '@microsoft/logic-apps-shared';

export const getOperationInfo = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition | LogicAppsV2.TriggerDefinition,
  isTrigger: boolean
): Promise<OperationInfo> => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();

  nodeId = nodeId.toLowerCase();
  return queryClient.fetchQuery<OperationInfo>(['operationInfo', { nodeId }], () =>
    // this is sync
    operationManifestService.getOperationInfo(operation, isTrigger)
  );
};

export const getConnector = async (connectorId: string, useCachedData = false): Promise<Connector> => {
  if (!connectorId) {
    throw new Error('ConnectorId must be defined');
  }
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  connectorId = connectorId.toLowerCase();
  return queryClient.fetchQuery(['connector', { connectorId }], () => connectionService.getConnector(connectorId, useCachedData));
};

export const getSwagger = async (connectorId: string): Promise<OpenAPIV2.Document> => {
  if (!connectorId) {
    throw new Error('ConnectorId must be defined');
  }
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  connectorId = connectorId.toLowerCase();
  return queryClient.fetchQuery(['swagger', { connectorId }], () => connectionService.getSwaggerFromConnector(connectorId));
};

export const getOperation = async ({ connectorId, operationId }: OperationInfo, useCachedData = false): Promise<any> => {
  if (!connectorId || !operationId) {
    throw new Error('OperationId and ConnectorId must be defined');
  }
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  connectorId = connectorId.toLowerCase();
  operationId = operationId.toLowerCase();
  return queryClient.fetchQuery(
    ['operation', { connectorId }, { operationId }],
    () => operationManifestService.getOperation(connectorId, operationId, useCachedData) ?? null
  );
};

export const getOperationManifest = async ({ connectorId, operationId }: OperationInfo): Promise<OperationManifest> => {
  if (!connectorId || !operationId) {
    throw new Error('OperationId and ConnectorId must be defined');
  }
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  connectorId = connectorId.toLowerCase();
  operationId = operationId.toLowerCase();
  return queryClient.fetchQuery(
    ['manifest', { connectorId }, { operationId }],
    () => operationManifestService.getOperationManifest(connectorId, operationId) ?? null
  );
};
