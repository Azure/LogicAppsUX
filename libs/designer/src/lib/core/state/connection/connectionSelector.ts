import type { ConnectionReference } from '../../../common/models/workflow';
import type { RootState } from '../../store';
import { useOperationManifest, useOperationInfo } from '../selectors/actionMetadataSelector';
import { ConnectionService, GatewayService } from '@microsoft/designer-client-services-logic-apps';
import type { Connector } from '@microsoft/utils-logic-apps';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const useConnector = (connectorId: string) => {
  const { data, ...rest } = useConnectorAndSwagger(connectorId);
  return { data: data?.connector, ...rest };
};
export const useConnectorAndSwagger = (connectorId: string) => {
  return useQuery(
    ['apiWithSwaggers', { connectorId }],
    async () => {
      return await ConnectionService().getConnectorAndSwagger(connectorId);
    },
    {
      enabled: !!connectorId,
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
  const connectorFromService = useConnector(storeConnectorId)?.data;
  return connectorFromManifest ?? connectorFromService;
};

export const useConnectionRefsByConnectorId = (connectorId?: string) => {
  const allConnectonReferences = useSelector((state: RootState) => Object.values(state.connections.connectionReferences));
  return allConnectonReferences.filter((ref: ConnectionReference) => ref.api.id === connectorId);
};

export const useIsOperationMissingConnection = (nodeId: string) => {
  const connectionsMapping = useSelector((state: RootState) => state.connections.connectionsMapping);
  return Object.keys(connectionsMapping).includes(nodeId) && connectionsMapping[nodeId] === null;
};
