import { type Connection, ConnectionService, equals, type KnowledgeHub, type KnowledgeHubArtifact, type KnowledgeHubExtended, LogEntryLevel, LoggerService, ResourceService } from "@microsoft/logic-apps-shared";
import { useQuery } from "@tanstack/react-query";
import { getReactQueryClient } from "lib/core/ReactQueryProvider";

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
        const response: any = await ResourceService().executeResourceAction(
          `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHub`,
          'GET',
          { 'api-version': '2025-11-01' }
        );

        const hubs = (response.value ?? [])
          .sort((a: KnowledgeHub, b: KnowledgeHub) => a.name.localeCompare(b.name));

        const promises: Promise<any>[] = hubs.map((hub: KnowledgeHub) => getArtifactsInHub(siteResourceId, hub.name));

        const extendedHubs = await Promise.all(promises);
        return hubs.map((hub: KnowledgeHub, index: number) => ({
          ...hub,
          artifacts: extendedHubs[index],
        }));
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

export const getArtifactsInHub = async (siteResourceId: string, hubName: string) => {
    const queryClient = getReactQueryClient();
    
    return queryClient.fetchQuery(
      ['knowledgeartifacts', siteResourceId.toLowerCase(), hubName.toLowerCase()],
      async (): Promise<KnowledgeHubArtifact[]> => {
        try {
          const response: any = await ResourceService().executeResourceAction(
            `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHub/${hubName}/knowledgeArtifact`,
            'GET',
            { 'api-version': '2025-11-01' }
          );

          return (response.value ?? [])
            .sort((a: KnowledgeHubArtifact, b: KnowledgeHubArtifact) => a.name.localeCompare(b.name));
        } catch (errorResponse: any) {
            const error = errorResponse?.error || {};            
            // For now log the error and return empty list
            LoggerService().log({
                level: LogEntryLevel.Error,
                area: 'KnowledgeHub.listKnowledgeHubArtifacts',
                error,
                message: `Error while fetching knowledge artifacts for the app: ${siteResourceId}`,
            });
            return [];
        }
    });
};

export const useConnection = async () => {
  return useQuery({
    queryKey: ['knowledgeconnection'],
    queryFn: async (): Promise<Connection | undefined> => {
      try {
        const allConnections = await ConnectionService().getConnections();
        return allConnections.find((connection) => equals(connection.type, 'connections/knowledgehub'));
      } catch (errorResponse: any) {
        const error = errorResponse?.error || {};

        // For now log the error and return empty list
        LoggerService().log({
          level: LogEntryLevel.Error,
          area: 'KnowledgeHub.getConnection',
          error,
          message: 'Error while fetching knowledge hub connection',
        });

        return undefined;
      }
    },
    ...queryOpts,
  });
}

export const getCosmosDbEndpoint = async (database: string): Promise<string | undefined> => {
  const queryClient = getReactQueryClient();

  return queryClient.fetchQuery(
      ['cosmosdbendpoint', database.toLowerCase()],
      async (): Promise<string | undefined> => {
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