import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { useQuery } from 'react-query';

const connectionKey = 'connections';

export const getConnections = (): void => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  queryClient.fetchQuery([connectionKey], () => connectionService.getConnections());
  return;
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
