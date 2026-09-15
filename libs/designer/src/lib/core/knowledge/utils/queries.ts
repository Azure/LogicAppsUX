import {
  type Connection,
  ConnectionService,
  equals,
  type KnowledgeHub,
  type KnowledgeHubExtended,
  LogEntryLevel,
  LoggerService,
  ResourceService,
} from '@microsoft/logic-apps-shared';
import { useQuery } from '@tanstack/react-query';
import { getReactQueryClient } from '../../ReactQueryProvider';

const queryOpts = {
  cacheTime: 1000 * 60 * 60 * 24,
  refetchOnMount: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
};

export const useAllKnowledgeHubs = (siteResourceId: string) => {
  return useQuery({
    queryKey: ['knowledgehubs', siteResourceId.toLowerCase()],
    queryFn: async (): Promise<KnowledgeHubExtended[]> => {
      try {
        const response: any = await ResourceService().getResource(
          `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgehubs`,
          { 'api-version': '2018-11-01' }
        );

        const hubs = (response ?? []).sort((a: KnowledgeHub, b: KnowledgeHub) => a.name.localeCompare(b.name));

        return hubs;
      } catch (errorResponse: any) {
        const error = errorResponse?.error || {};

        // For now log the error and return empty list
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'KnowledgeHub.listKnowledgeHubs',
          error,
          message: `Error while fetching knowledge hubs for the app: ${siteResourceId}`,
        });
        return [];
      }
    },
    enabled: !!siteResourceId,
    ...queryOpts,
  });
};

export const useConnection = () => {
  return useQuery({
    queryKey: ['knowledgeconnection'],
    queryFn: async (): Promise<Connection | null> => {
      try {
        const allConnections = await ConnectionService().getConnections();
        return allConnections.find((connection) => equals(connection.type, 'connections/knowledgehub')) || null;
      } catch (errorResponse: any) {
        const error = errorResponse?.error || {};

        // For now log the error and return empty list
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'KnowledgeHub.getConnection',
          error,
          message: 'Error while fetching knowledge hub connection',
        });

        return null;
      }
    },
    ...queryOpts,
  });
};

const normalizeEndpoint = (endpoint: string) => endpoint.trim().replace(/\/+$/, '').replace(/:443$/, '').toLowerCase();

export const useCosmosDbResourceId = (endpoint: string | undefined, subscriptionIds: string[]) => {
  return useQuery({
    queryKey: ['cosmosdbresourceid', endpoint ? normalizeEndpoint(endpoint) : '', [...subscriptionIds].sort()],
    queryFn: async (): Promise<string | null> => {
      const normalizedEndpoint = normalizeEndpoint(endpoint ?? '');
      const accountResults = await Promise.all(
        subscriptionIds.map(async (subscriptionId) => {
          try {
            return await ResourceService().listResources(
              subscriptionId,
              `resources | where type =~ 'Microsoft.DocumentDB/databaseAccounts' | where properties.provisioningState =~ 'Succeeded' | project id, properties`
            );
          } catch (errorResponse: any) {
            LoggerService().log({
              level: LogEntryLevel.Error,
              area: 'KnowledgeHub.getCosmosDbResourceId',
              error: errorResponse?.error ?? errorResponse,
              message: `Error while fetching Cosmos DB accounts for subscription: ${subscriptionId}`,
            });
            return [];
          }
        })
      );
      const matchingResourceIds = accountResults
        .flat()
        .filter((account: any) => normalizeEndpoint(account.properties?.documentEndpoint ?? '') === normalizedEndpoint)
        .map((account: any) => account.id)
        .filter((resourceId: unknown): resourceId is string => typeof resourceId === 'string');

      return matchingResourceIds.length === 1 ? matchingResourceIds[0] : null;
    },
    enabled: !!endpoint && subscriptionIds.length > 0,
    ...queryOpts,
  });
};

export const getCosmosDbEndpoint = async (database: string): Promise<string | undefined> => {
  const queryClient = getReactQueryClient();

  return queryClient.fetchQuery(['cosmosdbendpoint', database.toLowerCase()], async (): Promise<string | undefined> => {
    try {
      const response = await ResourceService().getResource(`${database}/listConnectionStrings`, { 'api-version': '2025-11-01' });
      return response?.properties.endpoint;
    } catch (errorResponse: any) {
      const error = errorResponse?.error || {};
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'KnowledgeHub.getCosmosDbEndpoint',
        error,
        message: `Error while fetching Cosmos DB endpoint for database: ${database}`,
      });
      return undefined;
    }
  });
};
