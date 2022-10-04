import type { ConnectionReference } from '../../../common/models/workflow';
import type { RootState } from '../../store';
import { useOperationManifest, useOperationInfo } from '../selectors/actionMetadataSelector';
import { ConnectionService, GatewayService } from '@microsoft-logic-apps/designer-client-services';
import type { Connector } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';
import { useSelector } from 'react-redux';

export const useConnector = (connectorId: string) => {
  const connectionService = ConnectionService();
  return useQuery(
    ['apiWithSwaggers', { connectorId }],
    async () => {
      const { connector } = await connectionService.getConnectorAndSwagger(connectorId);
      return connector;
    },
    {
      enabled: !!connectorId,
    }
  );
};

export const useGateways = (subscriptionId: string, connectorName: string) => {
  const gatewayService = GatewayService();
  return useQuery(
    ['gateways', { subscriptionId }, { connectorName }],
    async () => gatewayService.getGateways(subscriptionId, connectorName),
    {
      enabled: !!connectorName,
    }
  );
};

export const useSubscriptions = () => {
  const gatewayService = GatewayService();
  return useQuery('subscriptions', async () => gatewayService.getSubscriptions());
};

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
