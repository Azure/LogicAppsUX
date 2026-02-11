import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies before importing the module
const mockFetchQuery = vi.fn();
vi.mock('@microsoft/logic-apps-designer', () => ({
  getReactQueryClient: vi.fn(() => ({
    fetchQuery: mockFetchQuery,
  })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  LogEntryLevel: { Error: 'Error' },
  LoggerService: vi.fn(() => ({
    log: vi.fn(),
  })),
}));

import { fetchAgentUrl } from '../workflowService';

describe('workflowService', () => {
  const mockHttpClient = {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Make fetchQuery execute the query function passed to it
    mockFetchQuery.mockImplementation((_key: unknown, queryFn: () => Promise<unknown>) => queryFn());
  });

  describe('fetchAgentUrl', () => {
    it('should return empty URLs when workflowName is empty', async () => {
      const result = await fetchAgentUrl('', 'http://localhost:7071', mockHttpClient as any, 'clientId', 'tenantId');
      expect(result).toEqual({ agentUrl: '', chatUrl: '', hostName: '' });
    });

    it('should return empty URLs when both runtimeUrl and defaultHostName are missing', async () => {
      const result = await fetchAgentUrl('myWorkflow', '', mockHttpClient as any, 'clientId', 'tenantId');
      expect(result).toEqual({ agentUrl: '', chatUrl: '', hostName: '' });
    });

    it('should construct HTTP URLs for local workflows', async () => {
      mockHttpClient.post.mockResolvedValue({ key: 'test-key' });

      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071/runtime/webhooks/workflow/api/management',
        mockHttpClient as any,
        'clientId',
        'tenantId'
      );

      expect(result.agentUrl).toBe('http://localhost:7071/api/Agents/myWorkflow');
      expect(result.chatUrl).toBe('http://localhost:7071/api/agentsChat/myWorkflow/IFrame');
      expect(result.hostName).toBe('http://localhost:7071/runtime/webhooks/workflow/api/management');
    });

    it('should construct HTTPS URLs for Azure workflows with defaultHostName', async () => {
      mockHttpClient.post.mockResolvedValue({ key: 'test-key' });

      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071',
        mockHttpClient as any,
        'clientId',
        'tenantId',
        false,
        'myapp.azurewebsites.net'
      );

      expect(result.agentUrl).toBe('https://myapp.azurewebsites.net/api/Agents/myWorkflow');
      expect(result.chatUrl).toBe('https://myapp.azurewebsites.net/api/agentsChat/myWorkflow/IFrame');
      expect(result.hostName).toBe('myapp.azurewebsites.net');
    });

    it('should handle defaultHostName that already includes https://', async () => {
      mockHttpClient.post.mockResolvedValue({ key: 'test-key' });

      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071',
        mockHttpClient as any,
        'clientId',
        'tenantId',
        false,
        'https://myapp.azurewebsites.net'
      );

      expect(result.agentUrl).toBe('https://myapp.azurewebsites.net/api/Agents/myWorkflow');
    });

    it('should include apiKey in queryParams when A2A auth key is available', async () => {
      mockHttpClient.post.mockResolvedValue({ key: 'my-auth-key' });

      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071/runtime/webhooks/workflow/api/management',
        mockHttpClient as any,
        'clientId',
        'tenantId'
      );

      expect(result.queryParams).toEqual({ apiKey: 'my-auth-key' });
    });

    it('should not include queryParams when A2A auth key is not available', async () => {
      mockHttpClient.post.mockResolvedValue({});

      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071/runtime/webhooks/workflow/api/management',
        mockHttpClient as any,
        'clientId',
        'tenantId'
      );

      expect(result.queryParams).toBeUndefined();
    });

    it('should call httpClient.post with correct parameters for A2A auth', async () => {
      mockHttpClient.post.mockResolvedValue({ key: 'test-key' });

      await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071/runtime/webhooks/workflow/api/management',
        mockHttpClient as any,
        'test-client-id',
        'test-tenant-id'
      );

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        expect.objectContaining({
          uri: 'http://localhost:7071/runtime/webhooks/workflow/api/management/workflows/myWorkflow/listApiKeys?api-version=2018-11-01',
          headers: {
            'x-ms-client-object-id': 'test-client-id',
            'x-ms-client-tenant-id': 'test-tenant-id',
          },
        })
      );
    });

    it('should return fallback URLs on error', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071/runtime/webhooks/workflow/api/management',
        mockHttpClient as any,
        'clientId',
        'tenantId'
      );

      expect(result.agentUrl).toBe('');
      expect(result.chatUrl).toBe('');
      expect(result.hostName).toBe('http://localhost:7071/runtime/webhooks/workflow/api/management');
    });
  });
});
