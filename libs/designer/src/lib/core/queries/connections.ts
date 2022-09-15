import { getReactQueryClient } from '../ReactQueryProvider';
import type { ConnectorWithSwagger } from '@microsoft-logic-apps/designer-client-services';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { equals } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';

const connectionKey = 'connections';
export interface ConnectorWithParsedSwagger extends ConnectorWithSwagger {
  parsedSwagger: any;
}

export const getConnectorWithSwagger = async (connectorId: string): Promise<ConnectorWithParsedSwagger> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  return queryClient.fetchQuery(['apiWithSwaggers', { connectorId }], async () => {
    const { connector, swagger } = await connectionService.getConnectorAndSwagger(connectorId);
    const parsedSwagger = swagger;
    return { connector, swagger, parsedSwagger: parsedSwagger };
  });
};

export const getConnectionsQuery = async (): Promise<void> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  return queryClient.prefetchQuery([connectionKey], () => connectionService.getConnections());
};

export const useConnectionById = (connectionId: string, connectorId: string) => {
  const { data: connections, isLoading } = useConnectionsForConnector(connectorId);

  if (!connectionId) {
    return { isLoading: false, result: undefined };
  }

  if (connections) {
    return {
      isLoading,
      result: connections && connections.find((connection) => equals(connection.id, connectionId)),
    };
  }

  return {
    isLoading,
    result: undefined,
  };
};

export const useAllConnections = () => {
  return useQuery([connectionKey], () => {
    const connectionService = ConnectionService();
    return connectionService.getConnections();
  });
};

export const useConnectionsForConnector = (connectorId: string) => {
  return useQuery(
    [connectionKey, connectorId?.toLowerCase()],
    () => {
      const connectionService = ConnectionService();
      return connectionService.getConnections(connectorId);
    },
    { enabled: !!connectorId }
  );
};

export const getConnectionsForConnector = (connectorId: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery([connectionKey, connectorId?.toLowerCase()], async () => {
    const connectionService = ConnectionService();
    return connectionService.getConnections(connectorId);
  });
};
