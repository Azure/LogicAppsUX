import type { ConnectionReference } from '../../../common/models/workflow';
import type { RootState } from '../../store';
import { ConnectionService, GatewayService } from '@microsoft/designer-client-services-logic-apps';
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
  const storeConnectorId = useSelector((state: RootState) => state.operations.operationInfo[nodeId]?.connectorId);
  return useConnector(storeConnectorId)?.data;
};

export const useConnectionRefsByConnectorId = (connectorId?: string) => {
  const allConnectonReferences = useSelector((state: RootState) => Object.values(state.connections.connectionReferences));
  return allConnectonReferences.filter((ref: ConnectionReference) => ref.api.id === connectorId);
};

export const useIsOperationMissingConnection = (nodeId: string) => {
  const connectionsMapping = useSelector((state: RootState) => state.connections.connectionsMapping);
  return Object.keys(connectionsMapping).includes(nodeId) && connectionsMapping[nodeId] === null;
};
