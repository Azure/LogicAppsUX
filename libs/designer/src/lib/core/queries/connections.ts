import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { useQuery } from 'react-query';

const connectionKey = 'connections';

export const getConnectionsQuery = async (): Promise<void> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  return await queryClient.prefetchQuery([connectionKey], () => connectionService.getConnections());
};

export const useConnectionByName = (connectionName: string) => {
  const connectionsQuery = useQuery([connectionKey], () => {
    const connectionService = ConnectionService();
    return connectionService.getConnections();
  });
  const connections = connectionsQuery.data;
  const connectionForConnector = connections && connections.find((connection) => connection.name === connectionName);
  return connectionForConnector;
};
