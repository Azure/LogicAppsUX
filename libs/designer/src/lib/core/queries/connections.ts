import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { useQuery } from 'react-query';
import { equals } from '@microsoft-logic-apps/utils';

const connectionKey = 'connections';

export const getConnectionsQuery = async (): Promise<void> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  return await queryClient.prefetchQuery([connectionKey], () => connectionService.getConnections());
};

export const useConnectionById = (connectionId: string, connectorId: string) => {
  const { data: connections, isLoading } = useConnectionsForConnector(connectorId);

  if (connections) {
    return {
      isLoading,
      result: connections && connections.find((connection) => equals(connection.id, connectionId))
    };
  }

  return {
    isLoading,
    result: undefined
  };
};

export const useAllConnections = () => {
  return useQuery(
    [connectionKey],
    () => {
      const connectionService = ConnectionService();
      return connectionService.getConnections();
    }
  );
}

export const useConnectionsForConnector = (connectorId: string) => {
  return useQuery(
    [connectionKey, connectorId.toLowerCase()],
    () => {
      const connectionService = ConnectionService();
      return connectionService.getConnections(connectorId);
    }
  );
}
