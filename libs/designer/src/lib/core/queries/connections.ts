import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { useQuery } from 'react-query';

const connectionKey = 'connections';

export const getConnectionsQuery = async (): Promise<void> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  return await queryClient.fetchQuery([connectionKey], () => connectionService.getConnections());
};

export const useConnectionsForConnector = (connectorId: string) => {
  const connectionsQuery = useQuery([connectionKey], () => {
    const connectionService = ConnectionService();
    return connectionService.getConnections();
  });
  const connections = connectionsQuery.data;
  const connectionForConnector = connections && connections.find((connection) => connection.name === connectorId);
  return connectionForConnector;
};

export const useConnection = (connectorId: string) => {
  const connectionsQuery = useQuery([connectionKey], () => {
    const connectionService = ConnectionService();
    return connectionService.getConnections();
  });
  const connections = connectionsQuery.data;
  const connectionForConnector = connections && connections.find((connection) => connection.name === connectorId);
  return connectionForConnector;
};
