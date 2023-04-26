import { getReactQueryClient } from '../ReactQueryProvider';
import { ApiManagementService, ConnectionService } from '@microsoft/designer-client-services-logic-apps';
import { SwaggerParser } from '@microsoft/parsers-logic-apps';
import { equals } from '@microsoft/utils-logic-apps';
import type { Connector } from '@microsoft/utils-logic-apps';
import { useQuery } from 'react-query';

const connectionKey = 'connections';
export interface ConnectorWithParsedSwagger {
  connector: Connector;
  parsedSwagger: SwaggerParser;
}

export const getConnectorWithSwagger = async (connectorId: string): Promise<ConnectorWithParsedSwagger> => {
  const { connector, swagger } = await getReactQueryClient().fetchQuery(['apiWithSwaggers', connectorId.toLowerCase()], async () => {
    const { connector, swagger } = await ConnectionService().getConnectorAndSwagger(connectorId);
    const parsedSwagger = await SwaggerParser.parse(swagger);
    return { connector, swagger: parsedSwagger };
  });

  return { connector, parsedSwagger: new SwaggerParser(swagger) };
};

export const getSwaggerFromEndpoint = async (uri: string): Promise<SwaggerParser> => {
  const swagger = await getReactQueryClient().fetchQuery(['swaggers', uri.toLowerCase()], async () => {
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
  return useQuery([connectionKey], () => ConnectionService().getConnections(), {
    cacheTime: 0,
    staleTime: 0,
  });
};

export const useConnectionsForConnector = (connectorId: string) => {
  return useQuery([connectionKey, connectorId?.toLowerCase()], () => ConnectionService().getConnections(connectorId), {
    enabled: !!connectorId,
    refetchOnMount: true,
  });
};

export const getConnectionsForConnector = async (connectorId: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery([connectionKey, connectorId?.toLowerCase()], async () => {
    return await ConnectionService().getConnections(connectorId);
  });
};

export const getConnection = async (connectionId: string, connectorId: string) => {
  const connections = await getConnectionsForConnector(connectorId);
  return connections?.find((connection) => equals(connection.id, connectionId));
};

export const getUniqueConnectionName = async (connectorId: string): Promise<string> => {
  const connectionNames = (await getConnectionsForConnector(connectorId)).map((connection) => connection.name);
  const connectorName = connectorId.split('/').at(-1);
  return ConnectionService().getUniqueConnectionName(connectorId, connectionNames, connectorName as string);
};

export const getApiManagementSwagger = async (apimApiId: string): Promise<SwaggerParser> => {
  const queryClient = getReactQueryClient();
  const swagger = await queryClient.fetchQuery(['apimSwagger', apimApiId?.toLowerCase()], async () => {
    const swagger = await ApiManagementService().fetchApiMSwagger(apimApiId);
    return SwaggerParser.parse(swagger);
  });

  return new SwaggerParser(swagger);
};
