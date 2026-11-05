/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  getCosmosDbEndpoint,
  useAllKnowledgeHubs,
  useCompletionModels,
  useCompletionModelsByEndpoint,
  useConnection,
  useCosmosDbResourceId,
  useEmbeddingModels,
  useEmbeddingModelsByEndpoint,
} from '../queries';
import React from 'react';

const mockExecuteResourceAction = vi.fn();
const mockGetResource = vi.fn();
const mockListResources = vi.fn();
const mockGetConnections = vi.fn();
const mockFetchAllCognitiveServiceAccountDeployments = vi.fn();
const mockHttpGet = vi.fn();
const mockLog = vi.fn();

let queryClient: QueryClient;

vi.mock('@microsoft/logic-apps-shared', () => ({
  CognitiveServiceService: vi.fn(() => ({
    fetchAllCognitiveServiceAccountDeployments: mockFetchAllCognitiveServiceAccountDeployments,
    httpClient: { get: mockHttpGet },
  })),
  ResourceService: vi.fn(() => ({
    executeResourceAction: mockExecuteResourceAction,
    getResource: mockGetResource,
    listResources: mockListResources,
  })),
  ConnectionService: vi.fn(() => ({
    getConnections: mockGetConnections,
  })),
  LoggerService: vi.fn(() => ({
    log: mockLog,
  })),
  LogEntryLevel: {
    Error: 'Error',
  },
  equals: vi.fn((a: string, b: string) => a?.toLowerCase() === b?.toLowerCase()),
}));

vi.mock('../../../ReactQueryProvider', () => ({
  getReactQueryClient: vi.fn(() => queryClient),
}));

describe('knowledge queries', () => {
  const siteResourceId = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.Web/sites/myApp';

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const createWrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  describe('OpenAI models', () => {
    const resourceId = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.CognitiveServices/accounts/openai';

    test('derives completion and embedding options from one resource deployment request', async () => {
      mockFetchAllCognitiveServiceAccountDeployments.mockResolvedValue([
        { name: 'completion', properties: { capabilities: { chatCompletion: true }, provisioningState: 'Succeeded' } },
        { name: 'embedding', properties: { capabilities: { embeddings: true }, provisioningState: 'Succeeded' } },
      ]);

      const { result } = renderHook(() => ({ completion: useCompletionModels(resourceId), embedding: useEmbeddingModels(resourceId) }), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.completion.isSuccess).toBe(true);
        expect(result.current.embedding.isSuccess).toBe(true);
      });

      expect(mockFetchAllCognitiveServiceAccountDeployments).toHaveBeenCalledTimes(1);
      expect(result.current.completion.data).toEqual([{ text: 'completion', value: 'completion' }]);
      expect(result.current.embedding.data).toEqual([{ text: 'embedding', value: 'embedding' }]);
    });

    test('filters ready completion deployments into parameter options', async () => {
      mockFetchAllCognitiveServiceAccountDeployments.mockResolvedValue([
        { name: 'completion', properties: { capabilities: { chatCompletion: 'True' }, provisioningState: 'Succeeded' } },
        { name: 'embedding', properties: { capabilities: { embeddings: true }, provisioningState: 'Succeeded' } },
        { name: 'creating', properties: { capabilities: { chatCompletion: 'true' }, provisioningState: 'Creating' } },
      ]);

      const { result } = renderHook(() => useCompletionModels(resourceId), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetchAllCognitiveServiceAccountDeployments).toHaveBeenCalledTimes(1);
      expect(mockFetchAllCognitiveServiceAccountDeployments).toHaveBeenCalledWith(resourceId, { throwOnError: true });
      expect(result.current.data).toEqual([{ text: 'completion', value: 'completion' }]);
    });

    test('filters ready embedding deployments into parameter options', async () => {
      mockFetchAllCognitiveServiceAccountDeployments.mockResolvedValue([
        { name: 'embedding', properties: { capabilities: { embeddings: true }, provisioningState: 'Succeeded' } },
        { name: 'completion', properties: { capabilities: { chatCompletion: 'true' }, provisioningState: 'Succeeded' } },
        { name: 'disabled', properties: { capabilities: { embeddings: 'false' }, provisioningState: 'Succeeded' } },
      ]);

      const { result } = renderHook(() => useEmbeddingModels(resourceId), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockFetchAllCognitiveServiceAccountDeployments).toHaveBeenCalledWith(resourceId, { throwOnError: true });
      expect(result.current.data).toEqual([{ text: 'embedding', value: 'embedding' }]);
    });

    test('reports deployment retrieval failures instead of returning an authoritative empty list', async () => {
      mockFetchAllCognitiveServiceAccountDeployments.mockRejectedValue(new Error('ARM request failed'));

      const { result } = renderHook(() => useCompletionModels(resourceId), { wrapper: createWrapper });

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.data).toBeUndefined();
    });

    test('does not fetch deployments without a selected resource', () => {
      const { result } = renderHook(() => useCompletionModels(''), { wrapper: createWrapper });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockFetchAllCognitiveServiceAccountDeployments).not.toHaveBeenCalled();
    });

    test('derives endpoint model options from one credentialed request without caching the key', async () => {
      const endpoint = 'https://openai.openai.azure.com/';
      const key = 'secret-api-key';
      mockHttpGet.mockResolvedValue({
        data: [
          { id: 'completion', status: 'succeeded', capabilities: { completion: true, embeddings: false } },
          { id: 'chat', status: 'succeeded', capabilities: { completion: false, chat_completion: true, embeddings: false } },
          { id: 'embedding', status: 'succeeded', capabilities: { completion: false, embeddings: true } },
          { id: 'failed', status: 'failed', capabilities: { completion: true, embeddings: true } },
        ],
      });

      const { result } = renderHook(
        () => ({
          completion: useCompletionModelsByEndpoint(endpoint, key),
          embedding: useEmbeddingModelsByEndpoint(endpoint, key),
        }),
        { wrapper: createWrapper }
      );

      await waitFor(() => {
        expect(result.current.completion.isSuccess).toBe(true);
        expect(result.current.embedding.isSuccess).toBe(true);
      });

      expect(mockHttpGet).toHaveBeenCalledTimes(1);
      expect(mockHttpGet).toHaveBeenCalledWith({
        uri: 'https://openai.openai.azure.com/openai/models',
        queryParameters: { 'api-version': '2024-10-21' },
        headers: { 'X-ApiKey': key },
        noAuth: true,
      });
      expect(result.current.completion.data).toEqual([
        { text: 'completion', value: 'completion' },
        { text: 'chat', value: 'chat' },
      ]);
      expect(result.current.embedding.data).toEqual([{ text: 'embedding', value: 'embedding' }]);
      expect(
        queryClient
          .getQueryCache()
          .getAll()
          .every((query) => !JSON.stringify(query.queryKey).includes(key))
      ).toBe(true);
    });

    test('does not fetch endpoint models without both endpoint and key', () => {
      const { result } = renderHook(() => useCompletionModelsByEndpoint('https://openai.openai.azure.com', ''), {
        wrapper: createWrapper,
      });

      expect(result.current.fetchStatus).toBe('idle');
      expect(mockHttpGet).not.toHaveBeenCalled();
    });
  });

  describe('useAllKnowledgeHubs', () => {
    const mockHubs = [
      { name: 'hub-b', description: 'Second hub' },
      { name: 'hub-a', description: 'First hub' },
    ];

    test('should fetch and sort knowledge hubs alphabetically', async () => {
      mockGetResource.mockResolvedValueOnce(mockHubs);

      const { result } = renderHook(() => useAllKnowledgeHubs(siteResourceId), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockGetResource).toHaveBeenCalledWith(`${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgehubs`, {
        'api-version': '2018-11-01',
      });

      // Hubs should be sorted alphabetically
      expect(result.current.data?.[0].name).toBe('hub-a');
      expect(result.current.data?.[1].name).toBe('hub-b');
      expect(result.current.data).toHaveLength(2);
    });

    test('should return empty array and log error on failure', async () => {
      const error = { code: 'NotFound', message: 'Resource not found' };
      mockGetResource.mockRejectedValue({ error });

      const { result } = renderHook(() => useAllKnowledgeHubs(siteResourceId), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.listKnowledgeHubs',
        error,
        message: `Error while fetching knowledge hubs for the app: ${siteResourceId}`,
      });
    });

    test('should be disabled when siteResourceId is empty', async () => {
      const { result } = renderHook(() => useAllKnowledgeHubs(''), {
        wrapper: createWrapper,
      });

      // Query should not run
      expect(result.current.fetchStatus).toBe('idle');
      expect(mockGetResource).not.toHaveBeenCalled();
    });

    test('should handle empty hubs response', async () => {
      mockGetResource.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useAllKnowledgeHubs(siteResourceId), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });

    test('should handle null response', async () => {
      mockGetResource.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useAllKnowledgeHubs(siteResourceId), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('useConnection', () => {
    test('should find and return knowledge hub connection', async () => {
      const mockConnections = [
        { id: 'conn1', type: 'connections/sql', name: 'SQL Connection' },
        { id: 'conn2', type: 'connections/knowledgehub', name: 'Knowledge Hub' },
        { id: 'conn3', type: 'connections/servicebus', name: 'Service Bus' },
      ];
      mockGetConnections.mockResolvedValue(mockConnections);

      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual(mockConnections[1]);
    });

    test('should return null when no knowledge hub connection exists', async () => {
      const mockConnections = [{ id: 'conn1', type: 'connections/sql', name: 'SQL Connection' }];
      mockGetConnections.mockResolvedValue(mockConnections);

      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    test('should return null and log error on failure', async () => {
      const error = { code: 'Unauthorized', message: 'Access denied' };
      mockGetConnections.mockRejectedValue({ error });

      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.getConnection',
        error,
        message: 'Error while fetching knowledge hub connection',
      });
    });

    test('should return null when connections list is empty', async () => {
      mockGetConnections.mockResolvedValue([]);

      const { result } = renderHook(() => useConnection(), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });
  });

  describe('getCosmosDbEndpoint', () => {
    test('should fetch and return Cosmos DB endpoint', async () => {
      const database = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/myDb-success';
      const endpoint = 'https://mydb.documents.azure.com:443/';
      mockGetResource.mockResolvedValue({ properties: { endpoint } });

      const result = await getCosmosDbEndpoint(database);

      expect(mockGetResource).toHaveBeenCalledWith(`${database}/listConnectionStrings`, { 'api-version': '2025-11-01' });
      expect(result).toBe(endpoint);
    });

    test('should return undefined and log error on failure', async () => {
      const database = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/myDb-error';
      const error = { code: 'NotFound', message: 'Database not found' };
      mockGetResource.mockRejectedValue({ error });

      const result = await getCosmosDbEndpoint(database);

      expect(result).toBeUndefined();
      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.getCosmosDbEndpoint',
        error,
        message: `Error while fetching Cosmos DB endpoint for database: ${database}`,
      });
    });

    test('should return undefined when response has no endpoint', async () => {
      const database = '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/myDb-no-endpoint';
      mockGetResource.mockResolvedValue({ properties: {} });

      const result = await getCosmosDbEndpoint(database);

      expect(result).toBeUndefined();
    });

    test('should use lowercase database in cache key', async () => {
      const mixedCaseDb = '/Subscriptions/SUB1/ResourceGroups/RG/Providers/Microsoft.DocumentDB/databaseAccounts/MyDb-case';
      mockGetResource.mockResolvedValue({ properties: { endpoint: 'https://test.com' } });

      await getCosmosDbEndpoint(mixedCaseDb);

      // Verify cache key uses lowercase
      const cacheKey = ['cosmosdbendpoint', mixedCaseDb.toLowerCase()];
      const cachedData = queryClient.getQueryData(cacheKey);
      expect(cachedData).toBe('https://test.com');
    });
  });

  describe('useCosmosDbResourceId', () => {
    test('should match a Cosmos DB account by normalized endpoint', async () => {
      const resourceId = '/subscriptions/sub2/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/myDb';
      mockListResources.mockResolvedValueOnce([]).mockResolvedValueOnce([
        {
          id: resourceId,
          properties: { documentEndpoint: 'HTTPS://MYDB.DOCUMENTS.AZURE.COM' },
        },
      ]);

      const { result } = renderHook(() => useCosmosDbResourceId('https://mydb.documents.azure.com:443/', ['sub1', 'sub2']), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(resourceId);
      expect(mockListResources).toHaveBeenCalledTimes(2);
    });

    test('should not choose a resource ID when the endpoint match is ambiguous', async () => {
      mockListResources
        .mockResolvedValueOnce([
          {
            id: '/subscriptions/sub1/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/myDb',
            properties: { documentEndpoint: 'https://mydb.documents.azure.com:443/' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: '/subscriptions/sub2/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/myDb',
            properties: { documentEndpoint: 'https://mydb.documents.azure.com:443/' },
          },
        ]);

      const { result } = renderHook(() => useCosmosDbResourceId('https://mydb.documents.azure.com:443/', ['sub1', 'sub2']), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBeNull();
    });

    test('should continue matching when one subscription query fails', async () => {
      const resourceId = '/subscriptions/sub2/resourceGroups/rg/providers/Microsoft.DocumentDB/databaseAccounts/myDb';
      const error = { code: 'Forbidden', message: 'Access denied' };
      mockListResources.mockRejectedValueOnce({ error }).mockResolvedValueOnce([
        {
          id: resourceId,
          properties: { documentEndpoint: 'https://mydb.documents.azure.com:443/' },
        },
      ]);

      const { result } = renderHook(() => useCosmosDbResourceId('https://mydb.documents.azure.com:443/', ['sub1', 'sub2']), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toBe(resourceId);
      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.getCosmosDbResourceId',
        error,
        message: 'Error while fetching Cosmos DB accounts for subscription: sub1',
      });
    });
  });
});
