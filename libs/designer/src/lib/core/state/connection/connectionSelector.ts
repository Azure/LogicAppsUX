import type { ConnectionReference, ConnectionReferences } from '../../../common/models/workflow';
import { getConnection } from '../../queries/connections';
import type { RootState } from '../../store';
import { getConnectionReference, isConnectionMultiAuthManagedIdentityType } from '../../utils/connectors/connections';
import { useNodeConnectorId } from '../operation/operationSelector';
import { useOperationManifest, useOperationInfo } from '../selectors/actionMetadataSelector';
import type { ConnectionMapping } from './connectionSlice';
import {
  ConnectionService,
  GatewayService,
  OperationManifestService,
  isServiceProviderOperation,
} from '@microsoft/logic-apps-shared';
import { getRecordEntry, type Connector } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const useConnector = (connectorId: string | undefined, enabled = true) => {
  const { data, ...rest } = useConnectorAndSwagger(connectorId, enabled);
  return { data: data?.connector, ...rest };
};

export const useConnectorAndSwagger = (connectorId: string | undefined, enabled = true) => {
  return useQuery(
    ['apiWithSwaggers', { connectorId }],
    async () => {
      if (!connectorId) return;
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

const useConnectionByNodeId = (nodeId: string) => {
  const operationInfo = useOperationInfo(nodeId);
  const connectionId = useNodeConnectionId(nodeId);
  return useQuery(
    ['connection', { connectorId: operationInfo?.connectorId }, { connectionId }],
    () => {
      if (!connectionId || !operationInfo?.connectorId) return;
      return getConnection(connectionId, operationInfo.connectorId);
    },
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
  return Object.keys(connectionsMapping).includes(nodeId) && getRecordEntry(connectionsMapping, nodeId) === null;
};

export const useShowIdentitySelectorQuery = (nodeId: string) => {
  const connector = useConnectorByNodeId(nodeId);
  const connectionQuery = useConnectionByNodeId(nodeId);
  const operationInfo = useOperationInfo(nodeId);
  const connectionReference = useSelector((state: RootState) => getConnectionReference(state.connections, nodeId));

  return useMemo(() => {
    if (connectionReference && !connectionQuery.isLoading && !isServiceProviderOperation(operationInfo?.type)) {
      return isConnectionMultiAuthManagedIdentityType(connectionQuery.data, connector);
    }
    return false;
  }, [connectionQuery, connectionReference, connector, operationInfo?.type]);
};
