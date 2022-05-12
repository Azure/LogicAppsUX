import { getReactQueryClient } from '../ReactQueryProvider';
import type { Actions } from '../state/workflowSlice';
import { ConnectionService, OperationManifestService } from '@microsoft-logic-apps/designer-client-services';
import type { Connector, OperationInfo, OperationManifest } from '@microsoft-logic-apps/utils';

export const initializeOperationMetadata = async (actions: Actions): Promise<(Connector | OperationManifest)[]> => {
  const operationPromises: Promise<OperationManifest>[] = [];
  const connectionPromises: Promise<Connector>[] = [];
  const operationDetailsPromises: Promise<void>[] = [];
  const operationEntries = Object.entries(actions ? actions : {});
  const operationManifestService = OperationManifestService();
  for (let i = 0; i < operationEntries.length; i++) {
    const operation = operationEntries[i][1];
    if (operationManifestService.isSupported(operation.type)) {
      const operationDetails = initializeOperationDetailsForManifest(
        operationEntries[i][0],
        operationEntries[i][1],
        operationPromises,
        connectionPromises
      );
      operationDetailsPromises.push(operationDetails);
    } else {
      // swagger case here
    }
  }
  return Promise.all([...operationPromises, ...connectionPromises]);
};

const initializeOperationDetailsForManifest = async (
  nodeId: string,
  operation: LogicAppsV2.ActionDefinition,
  operationPromises: Promise<OperationManifest>[],
  connectionPromises: Promise<Connector>[]
): Promise<void> => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  if (OperationManifestService().isSupported(operation.type)) {
    nodeId = nodeId.toLowerCase();
    const operationInfo = await queryClient.fetchQuery<OperationInfo>(['operationIds', { nodeId }], () =>
      // this is sync
      operationManifestService.getOperationInfo(operation)
    );
    if (operationInfo) {
      const operationManifest = fetchOperationManifest(operationInfo.connectorId, operationInfo.operationId);
      if (operationManifest) {
        operationPromises.push(operationManifest);
      }
      const connector = fetchConnector(operationInfo.connectorId);
      if (connector) {
        connectionPromises.push(connector);
      }
    }
  }
};

const fetchConnector = (connectorId: string) => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  if (!connectorId) {
    throw new Error('ConnectorId must be defined');
  }
  connectorId = connectorId.toLowerCase();
  const connectorQuery = queryClient.fetchQuery(['connector', { connectorId }], () => connectionService.getConnector(connectorId));
  return connectorQuery;
};

const fetchOperationManifest = (connectorId: string, operationId: string) => {
  const queryClient = getReactQueryClient();
  const operationManifestService = OperationManifestService();
  if (!connectorId || !operationId) {
    return undefined;
  }
  connectorId = connectorId.toLowerCase();
  operationId = operationId.toLowerCase();
  const manifestQuery = queryClient.fetchQuery(['manifest', { connectorId }, { operationId }], () =>
    operationManifestService.getOperationManifest(connectorId, operationId)
  );

  return manifestQuery;
};
