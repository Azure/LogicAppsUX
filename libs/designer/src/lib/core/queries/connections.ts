import { getReactQueryClient } from '../ReactQueryProvider';
import { getConnectionErrors } from '../utils/connectors/connections';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import type { Connector } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';

const connectionKey = 'connections';

export const getConnectionsQuery = async (): Promise<void> => {
  const queryClient = getReactQueryClient();
  const connectionService = ConnectionService();
  return await queryClient.prefetchQuery([connectionKey], () => connectionService.getConnections());
};

export const useConnectionByName = (connectionName: string) => {
  const connectionsQuery = useQuery(
    [connectionKey],
    () => {
      const connectionService = ConnectionService();
      return connectionService.getConnections();
    },
    { staleTime: 1000 * 6 * 5 }
  );

  const connections = connectionsQuery.data;
  const connectionForConnector = connections && connections.find((connection) => connection.name === connectionName);
  return connectionForConnector;
};

export const useConnectionsByConnector = (connector?: Connector, filterInvalidConnections?: boolean) => {
  const connectionsQuery = useQuery(
    [connectionKey],
    () => {
      const connectionService = ConnectionService();
      return connectionService.getConnections();
    },
    { staleTime: 1000 * 6 * 5 }
  );

  if (!connector) return [];

  return (connectionsQuery.data ?? []).filter(
    (connection) =>
      connection.properties.api.id === connector.id && (!filterInvalidConnections || getConnectionErrors(connection).length === 0)
  );
};
