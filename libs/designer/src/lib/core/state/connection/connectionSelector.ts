import type { ConnectionMapping, ConnectionReference, ConnectionReferences } from '../../../common/models/workflow';
import { useConnectionResource } from '../../queries/connections';
import type { RootState } from '../../store';
import { getConnectionReference, isConnectionMultiAuthManagedIdentityType } from '../../utils/connectors/connections';
import { useNodeConnectorId } from '../operation/operationSelector';
import { useOperationManifest, useOperationInfo } from '../selectors/actionMetadataSelector';
import {
  type Gateway,
  ConnectionService,
  GatewayService,
  OperationManifestService,
  isServiceProviderOperation,
  getRecordEntry,
  type Connector,
} from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { ConnectionsStoreState } from './connectionSlice';

export const useConnector = (connectorId: string | undefined, enabled = true): UseQueryResult<Connector | undefined, unknown> => {
  const { data, ...rest }: any = useConnectorAndSwagger(connectorId, enabled);
  return { data: data?.connector, ...rest };
};

export const useConnectorAndSwagger = (connectorId: string | undefined, enabled = true) => {
  return useQuery(
    ['apiWithSwaggers', { connectorId }],
    async () => {
      if (!connectorId) {
        return null;
      }
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

export const useGateways = (subscriptionId: string, connectorName: string): UseQueryResult<Gateway[], unknown> => {
  return useQuery(
    ['gateways', { subscriptionId }, { connectorName }],
    async () => GatewayService().getGateways(subscriptionId, connectorName),
    {
      enabled: !!connectorName,
    }
  );
};

export const useSubscriptions = () => useQuery(['subscriptions'], async () => GatewayService().getSubscriptions());

export const useGatewayServiceConfig = () => useMemo(() => GatewayService().getConfig?.() ?? {}, []);

export const useConnectorByNodeId = (nodeId: string): Connector | undefined => {
  const connectorFromManifest = useOperationManifest(useOperationInfo(nodeId)).data?.properties.connector;
  const storeConnectorId = useNodeConnectorId(nodeId);
  const operationInfo = useOperationInfo(nodeId);

  // Connector data inside of operation manifests is missing some connection data currently (7/24/2023).
  // The below logic is to only use the manifest connector data when we expect a service call to fail. (i.e. our built-in local operations)
  const isManifestSupported = OperationManifestService().isSupported(operationInfo?.type ?? '', operationInfo?.kind ?? '');
  const isServiceProvider = isServiceProviderOperation(operationInfo?.type);
  const useManifestConnector = isManifestSupported && !isServiceProvider;
  const enableConnectorFromService = !connectorFromManifest || !useManifestConnector;
  const connectorFromService = useConnector(storeConnectorId, enableConnectorFromService)?.data;
  return connectorFromService ?? connectorFromManifest;
};

export const useNodeConnectionId = (nodeId: string): string => {
  const connectionsMapping = useConnectionMapping();
  const connectionReferences = useConnectionRefs();
  return useMemo(() => {
    const mapping = getRecordEntry(connectionsMapping, nodeId) ?? '';
    const reference = getRecordEntry(connectionReferences, mapping);
    return reference?.connection?.id ?? '';
  }, [connectionsMapping, connectionReferences, nodeId]);
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
  return Object.keys(connectionsMapping ?? {}).includes(nodeId) && getRecordEntry(connectionsMapping, nodeId) === null;
};

export const useShowIdentitySelectorQuery = (nodeId: string) => {
  const connector = useConnectorByNodeId(nodeId);
  const connectionId = useNodeConnectionId(nodeId);
  const { data: connection, isLoading } = useConnectionResource(connectionId);
  const operationInfo = useOperationInfo(nodeId);
  const connectionReference = useSelector((state: RootState) => getConnectionReference(state.connections, nodeId));

  return useMemo(() => {
    if (!connectionId || !connector?.id) {
      return { isLoading: false, result: false };
    }

    if (connectionReference && !isServiceProviderOperation(operationInfo?.type)) {
      return { isLoading, result: isLoading ? undefined : isConnectionMultiAuthManagedIdentityType(connection, connector) };
    }

    return { isLoading: false, result: false };
  }, [connectionId, connector, connectionReference, operationInfo?.type, isLoading, connection]);
};

export const getConnectionReferenceForNodeId = (
  connectionState: ConnectionsStoreState,
  nodeId: string
): { connectionReference: ConnectionReference; referenceKey: string } | undefined => {
  const { connectionReferences, connectionsMapping } = connectionState;
  const referenceKey = connectionsMapping[nodeId];
  return referenceKey ? { connectionReference: connectionReferences[referenceKey], referenceKey } : undefined;
};
