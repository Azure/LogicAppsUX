import {
  CognitiveServiceService,
  type Connection,
  ConnectionService,
  type ConnectionParameterAllowedValue,
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

interface CognitiveServiceDeployment {
  name?: string;
  properties?: {
    capabilities?: Record<string, boolean | string>;
    provisioningState?: string;
  };
}

interface OpenAIModel {
  id?: string;
  status?: string;
  capabilities?: Record<string, boolean>;
}

interface OpenAIModelsResponse {
  data?: OpenAIModel[];
}

const useOpenAIModels = (resourceId: string, capability: 'chatCompletion' | 'embeddings') =>
  useQuery({
    queryKey: ['knowledgeOpenAIDeployments', resourceId.toLowerCase()],
    queryFn: async (): Promise<CognitiveServiceDeployment[]> =>
      (await CognitiveServiceService().fetchAllCognitiveServiceAccountDeployments(resourceId, { throwOnError: true })) ?? [],
    select: (deployments): ConnectionParameterAllowedValue[] =>
      deployments
        .filter((deployment) => {
          const capabilityEnabled = String(deployment.properties?.capabilities?.[capability] ?? '').toLowerCase() === 'true';
          const provisioningState = deployment.properties?.provisioningState?.toLowerCase();
          return !!deployment.name && capabilityEnabled && (!provisioningState || provisioningState === 'succeeded');
        })
        .map(({ name }) => ({ text: name, value: name })),
    enabled: !!resourceId,
    ...queryOpts,
  });

export const useCompletionModels = (resourceId: string) => useOpenAIModels(resourceId, 'chatCompletion');

export const useEmbeddingModels = (resourceId: string) => useOpenAIModels(resourceId, 'embeddings');

const useOpenAIModelsByEndpoint = (endpoint: string, key: string, capability: 'completion' | 'embeddings') => {
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');

  return useQuery({
    queryKey: ['knowledgeOpenAIModels', normalizedEndpoint.toLowerCase()],
    queryFn: async (): Promise<OpenAIModel[]> => {
      const response = await CognitiveServiceService().httpClient.get<OpenAIModelsResponse>({
        uri: `${normalizedEndpoint}/openai/models`,
        queryParameters: { 'api-version': '2024-10-21' },
        headers: { 'X-ApiKey': key },
        noAuth: true,
      });
      return response.data ?? [];
    },
    select: (models): ConnectionParameterAllowedValue[] =>
      models
        .filter((model) => {
          const capabilityEnabled =
            model.capabilities?.[capability] === true || (capability === 'completion' && model.capabilities?.chat_completion === true);
          return !!model.id && model.status?.toLowerCase() === 'succeeded' && capabilityEnabled;
        })
        .map(({ id }) => ({ text: id, value: id })),
    enabled: !!normalizedEndpoint && !!key,
    ...queryOpts,
    cacheTime: 0,
    refetchOnMount: true,
  });
};

export const useCompletionModelsByEndpoint = (endpoint: string, key: string) => useOpenAIModelsByEndpoint(endpoint, key, 'completion');

export const useEmbeddingModelsByEndpoint = (endpoint: string, key: string) => useOpenAIModelsByEndpoint(endpoint, key, 'embeddings');

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
