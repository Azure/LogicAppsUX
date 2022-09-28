import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService } from '@microsoft-logic-apps/designer-client-services';
import { SwaggerParser } from '@microsoft-logic-apps/parsers';
import type { Connector} from '@microsoft-logic-apps/utils';
import { equals } from '@microsoft-logic-apps/utils';
import { useQuery } from 'react-query';

const connectionKey = 'connections';
export interface ConnectorWithParsedSwagger {
  connector: Connector;
  parsedSwagger: SwaggerParser;
}

export const getConnectorWithSwagger = async (connectorId: string): Promise<ConnectorWithParsedSwagger> => {
  const { connector, swagger } = await getReactQueryClient().fetchQuery(['apiWithSwaggers', connectorId.toLowerCase() ], async () => {
    const { connector, swagger } = await ConnectionService().getConnectorAndSwagger(connectorId);
    const parsedSwagger = await SwaggerParser.parse(swagger);
    return { connector, swagger: parsedSwagger };
  });

  return { connector, parsedSwagger: new SwaggerParser(swagger) };
};

export const getSwaggerFromEndpoint = async (uri: string): Promise<SwaggerParser> => {
  const swagger = await getReactQueryClient().fetchQuery(['swaggers', uri.toLowerCase() ], async () => {
    const swagger = await ConnectionService().getSwaggerFromUri(uri);
    return SwaggerParser.parse(swagger);
  });

  return new SwaggerParser(swagger);
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

export const getUniqueConnectionName = async (connectorId: string): Promise<string> => {
  const connectionNames = (await getConnectionsForConnector(connectorId)).map((connection) => connection.name);
  const connectorName = connectorId.split('/').at(-1);
  return ConnectionService().getUniqueConnectionName(connectorId, connectionNames, connectorName as string);
};
