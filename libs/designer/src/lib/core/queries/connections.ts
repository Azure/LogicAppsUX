import { getReactQueryClient } from '../ReactQueryProvider';
import { ConnectionService, SwaggerParser, equals, cleanResourceId } from '@microsoft/logic-apps-shared';
import type { Connection, Connector } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getConnector, getSwagger } from './operation';

const connectionKey = 'connections';
export interface ConnectorWithParsedSwagger {
  connector: Connector;
  parsedSwagger: SwaggerParser;
}

export const updateNewConnectionInQueryCache = async (connectorId: string, connection: Connection) => {
  const queryClient = getReactQueryClient();

  // Update all connections cache (Used for custom connectors)
  queryClient.setQueryData<Connection[]>(['allConnections'], (oldConnections: Connection[] | undefined) => [
    ...(oldConnections ?? []),
    connection,
  ]);
  // Update connector specific cache (Used for everything else)
  queryClient.setQueryData<Connection[]>(['connections', connectorId?.toLowerCase()], (oldConnections: Connection[] | undefined) => [
    ...(oldConnections ?? []),
    connection,
  ]);
};

export const getConnectorWithSwagger = async (connectorId: string): Promise<ConnectorWithParsedSwagger> => {
  const [connector, swagger] = await Promise.all([await getConnector(connectorId), await getSwagger(connectorId)]);
  const parsedSwagger = await SwaggerParser.parse(swagger);
  return { connector, parsedSwagger: new SwaggerParser(parsedSwagger) };
};

export const getSwaggerForConnector = async (connectorId: string): Promise<SwaggerParser> => {
  const swagger = await getSwagger(connectorId);
  const parsedSwagger = await SwaggerParser.parse(swagger);
  return new SwaggerParser(parsedSwagger);
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
  const { data: connections, isLoading: areConnectionsLoading } = useConnectionsForConnector(connectorId);
  const { data: connection, isLoading: isConnectionLoading } = useConnectionResource(connectionId);
  const isLoading = areConnectionsLoading || isConnectionLoading;

  return useMemo(() => {
    if (!connectionId || !connectorId) {
      return { isLoading: false, result: undefined };
    }

    if (!connections && !connection) {
      return {
        isLoading,
        result: undefined,
      };
    }

    const foundConnection = (connections ?? []).find((connection: any) => equals(connection.id, connectionId));
    return {
      isLoading,
      result: foundConnection ?? connection,
    };
  }, [connection, connectionId, connections, connectorId, isLoading]);
};

export const useAllConnections = (): UseQueryResult<Connection[], unknown> => {
  return useQuery([connectionKey], () => ConnectionService().getConnections(), {
    cacheTime: 0,
    staleTime: 0,
  });
};

export const useConnectionsForConnector = (connectorId: string, shouldNotRefetch?: boolean) => {
  const queryClient = useQueryClient();
  return useQuery([connectionKey, connectorId?.toLowerCase()], () => ConnectionService().getConnections(connectorId, queryClient), {
    enabled: !!connectorId,
    refetchOnMount: !shouldNotRefetch && true,
    cacheTime: 0,
    staleTime: 0,
  });
};

export const getConnectionsForConnector = async (connectorId: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery([connectionKey, connectorId?.toLowerCase()], async () => {
    return await ConnectionService().getConnections(connectorId, queryClient);
  });
};

export const getConnection = async (_connectionId: string, _connectorId: string, fetchResourceIfNeeded = false) => {
  const connectionId = cleanResourceId(_connectionId);
  const connectorId = cleanResourceId(_connectorId);
  const connections = await getConnectionsForConnector(connectorId);
  const connection = connections?.find((connection) => equals(connection.id, connectionId));
  return (!connection && fetchResourceIfNeeded ? getConnectionFromResource(connectionId) : connection) ?? null;
};

export const getUniqueConnectionName = async (connectorId: string, existingKeys: string[] = []): Promise<string> => {
  const connectionNames = (await getConnectionsForConnector(connectorId)).map((connection) => connection.name);
  const connectorName = connectorId.split('/').at(-1);
  return ConnectionService().getUniqueConnectionName(connectorId, [...connectionNames, ...existingKeys], connectorName as string);
};

export const useConnectionResource = (_connectionId: string) => {
  const connectionId = cleanResourceId(_connectionId)?.toLowerCase();
  return useQuery(['connection', connectionId], () => ConnectionService().getConnection(connectionId) ?? null, {
    enabled: !!_connectionId,
    refetchOnMount: false,
  });
};

const getConnectionFromResource = async (connectionId: string) => {
  const queryClient = getReactQueryClient();
  return queryClient.fetchQuery(['connection', connectionId?.toLowerCase()], async () => {
    return (await ConnectionService().getConnection(connectionId)) ?? null;
  });
};
