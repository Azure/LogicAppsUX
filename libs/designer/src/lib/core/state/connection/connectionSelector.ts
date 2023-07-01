import type { ConnectionReference, ConnectionReferences } from '../../../common/models/workflow';
import { getConnection } from '../../queries/connections';
import type { RootState } from '../../store';
import { getConnectionId, getConnectionReference, isConnectionMultiAuthManagedIdentityType } from '../../utils/connectors/connections';
import { useOperationManifest, useOperationInfo } from '../selectors/actionMetadataSelector';
import type { ConnectionMapping } from './connectionSlice';
import { ConnectionService, GatewayService, OperationManifestService, isServiceProviderOperation } from '@microsoft/designer-client-services-logic-apps';
import type { Connector } from '@microsoft/utils-logic-apps';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const useConnector = (connectorId: string, enabled = true) => {
  const { data, ...rest } = useConnectorAndSwagger(connectorId, enabled);
  return { data: data?.connector, ...rest };
};
export const useConnectorAndSwagger = (connectorId: string, enabled = true) => {
  return useQuery(
    ['apiWithSwaggers', { connectorId }],
    async () => {
      return await ConnectionService().getConnectorAndSwagger(connectorId);
    },
    {
      enabled: !!connectorId && enabled,
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export const useGateways = (subscriptionId: string, connectorName: string) => {
  return useQuery(
    ['gateways', { subscriptionId }, { connectorName }],
    async () => GatewayService().getGateways(subscriptionId, connectorName),
    {
      enabled: !!connectorName,
    }
  );
};

export const useSubscriptions = () => useQuery('subscriptions', async () => GatewayService().getSubscriptions());

export const useConnectorByNodeId = (nodeId: string): Connector | undefined => {
  // TODO: Revisit trying to conditionally ask for the connector from the service
  const connectorFromManifest = useOperationManifest(useOperationInfo(nodeId)).data?.properties.connector;
  const storeConnectorId = useSelector((state: RootState) => state.operations.operationInfo[nodeId]?.connectorId);
  const operationInfo = useOperationInfo(nodeId);

  const useManifest = OperationManifestService().isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');
  const connectorFromService = useConnector(storeConnectorId, !useManifest)?.data;
  return connectorFromService ?? connectorFromManifest;
};

export const useNodeConnectionId = (nodeId: string): string =>
  useSelector((state: RootState) => getConnectionId(state.connections, nodeId));

const useConnectionByNodeId = (nodeId: string) => {
  const operationInfo = useOperationInfo(nodeId);
  const connectionId = useNodeConnectionId(nodeId);
  return useQuery(
    ['connection', { connectorId: operationInfo?.connectorId }, { connectionId }],
    () => getConnection(connectionId, operationInfo.connectorId),
    {
      enabled: !!connectionId && !!operationInfo?.connectorId,
      placeholderData: undefined,
      cacheTime: 1000 * 60 * 60 * 24,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    }
  );
};

export const useConnectionMapping = (): ConnectionMapping => {
  return useSelector((state: RootState) => {
    return state.connections.connectionsMapping;
  });
};

export const useConnectionRefs = (): ConnectionReferences => {
  return useSelector((state: RootState) => {
    return state.connections.connectionReferences;
  });
};

export const useConnectionRefsByConnectorId = (connectorId?: string) => {
  const allConnectionReferences = useSelector((state: RootState) => Object.values(state.connections.connectionReferences));
  return allConnectionReferences.filter((ref: ConnectionReference) => ref.api.id === connectorId);
};

export const useIsOperationMissingConnection = (nodeId: string) => {
  const connectionsMapping = useSelector((state: RootState) => state.connections.connectionsMapping);
  return Object.keys(connectionsMapping).includes(nodeId) && connectionsMapping[nodeId] === null;
};

export const useShowIdentitySelector = (nodeId: string): boolean => {
  const connector = useConnectorByNodeId(nodeId);
  const connectionQuery = useConnectionByNodeId(nodeId);
  return useSelector((state: RootState) => {
    const operationInfo = state.operations.operationInfo[nodeId];
    const connectionReference = getConnectionReference(state.connections, nodeId);
    if (connectionReference && !isServiceProviderOperation(operationInfo?.type) && !connectionQuery.isLoading) {
      return isConnectionMultiAuthManagedIdentityType(connectionQuery.data, connector);
    }

    return false;
  });
};
