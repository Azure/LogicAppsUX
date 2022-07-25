import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { equals } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';

const connectionKey = 'connections';

export const getConnectionsQuery = async (): Promise<void> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  return await queryClient.prefetchQuery([connectionKey], () => connectionService.getConnections());
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
