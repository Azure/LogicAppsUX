/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAllKnowledgeHubs, getArtifactsInHub, useConnection, getCosmosDbEndpoint } from '../queries';
import React from 'react';

const mockExecuteResourceAction = vi.fn();
const mockGetResource = vi.fn();
const mockGetConnections = vi.fn();
const mockLog = vi.fn();

let queryClient: QueryClient;

vi.mock('@microsoft/logic-apps-shared', () => ({
  ResourceService: vi.fn(() => ({
    executeResourceAction: mockExecuteResourceAction,
    getResource: mockGetResource,
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

  describe('useAllKnowledgeHubs', () => {
    const mockHubs = [
      { name: 'hub-b', description: 'Second hub' },
      { name: 'hub-a', description: 'First hub' },
    ];

    const mockArtifacts = [
      { name: 'artifact-1', type: 'document' },
      { name: 'artifact-2', type: 'document' },
    ];

    test('should fetch and sort knowledge hubs with their artifacts', async () => {
      mockExecuteResourceAction
        .mockResolvedValueOnce({ value: mockHubs })
        .mockResolvedValueOnce({ value: mockArtifacts })
        .mockResolvedValueOnce({ value: [] });

      const { result } = renderHook(() => useAllKnowledgeHubs(siteResourceId), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHub`,
        'GET',
        { 'api-version': '2025-11-01' }
      );

      // Hubs should be sorted alphabetically
      expect(result.current.data?.[0].name).toBe('hub-a');
      expect(result.current.data?.[1].name).toBe('hub-b');
      expect(result.current.data).toHaveLength(2);
    });

    test('should return empty array and log error on failure', async () => {
      const error = { code: 'NotFound', message: 'Resource not found' };
      mockExecuteResourceAction.mockRejectedValue({ error });

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
      expect(mockExecuteResourceAction).not.toHaveBeenCalled();
    });

    test('should handle empty hubs response', async () => {
      mockExecuteResourceAction.mockResolvedValueOnce({ value: [] });

      const { result } = renderHook(() => useAllKnowledgeHubs(siteResourceId), {
        wrapper: createWrapper,
      });

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });

      expect(result.current.data).toEqual([]);
    });
  });

  describe('getArtifactsInHub', () => {
    test('should fetch and sort artifacts for a hub', async () => {
      const hubName = 'test-hub-sort';
      const mockArtifacts = [
        { name: 'doc-z', type: 'document' },
        { name: 'doc-a', type: 'document' },
      ];
      mockExecuteResourceAction.mockResolvedValue({ value: mockArtifacts });

      const result = await getArtifactsInHub(siteResourceId, hubName);

      expect(mockExecuteResourceAction).toHaveBeenCalledWith(
        `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/knowledgeHub/${hubName}/knowledgeArtifact`,
        'GET',
        { 'api-version': '2025-11-01' }
      );

      // Artifacts should be sorted alphabetically
      expect(result[0].name).toBe('doc-a');
      expect(result[1].name).toBe('doc-z');
    });

    test('should return empty array and log error on failure', async () => {
      const hubName = 'test-hub-error';
      const error = { code: 'BadRequest', message: 'Invalid hub' };
      mockExecuteResourceAction.mockRejectedValue({ error });

      const result = await getArtifactsInHub(siteResourceId, hubName);

      expect(result).toEqual([]);
      expect(mockLog).toHaveBeenCalledWith({
        level: 'Error',
        area: 'KnowledgeHub.listKnowledgeHubArtifacts',
        error,
        message: `Error while fetching knowledge artifacts for the app: ${siteResourceId}`,
      });
    });

    test('should handle empty artifacts response', async () => {
      const hubName = 'test-hub-empty';
      mockExecuteResourceAction.mockResolvedValue({ value: [] });

      const result = await getArtifactsInHub(siteResourceId, hubName);

      expect(result).toEqual([]);
    });

    test('should handle response without value property', async () => {
      const hubName = 'test-hub-no-value';
      mockExecuteResourceAction.mockResolvedValue({});

      const result = await getArtifactsInHub(siteResourceId, hubName);

      expect(result).toEqual([]);
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
});
