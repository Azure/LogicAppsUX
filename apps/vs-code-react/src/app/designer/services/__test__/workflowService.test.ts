import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the dependencies before importing the module
vi.mock('@microsoft/logic-apps-designer', () => ({
  getReactQueryClient: vi.fn(() => ({
    fetchQuery: vi.fn((_key: any, queryFn: any) => queryFn()),
  })),
}));

vi.mock('@microsoft/logic-apps-shared', () => ({
  LogEntryLevel: { Error: 'Error' },
  LoggerService: vi.fn(() => ({
    log: vi.fn(),
  })),
}));

// Import the actual function after mocks
import { fetchAgentUrl } from '../workflowService';

describe('workflowService', () => {
  const mockHttpClient = {
    post: vi.fn().mockResolvedValue({ key: 'test-key' }),
    get: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockHttpClient.post.mockResolvedValue({ key: 'test-key' });
  });

  describe('fetchAgentUrl', () => {
    it('should return empty URLs when workflowName is empty', async () => {
      const result = await fetchAgentUrl('', 'http://localhost:7071', mockHttpClient as any, 'client-id', 'tenant-id');
      expect(result).toEqual({ agentUrl: '', chatUrl: '', hostName: '' });
    });

    it('should return empty URLs when neither runtimeUrl nor defaultHostName is provided', async () => {
      const result = await fetchAgentUrl('myWorkflow', '', mockHttpClient as any, 'client-id', 'tenant-id', false, undefined);
      expect(result).toEqual({ agentUrl: '', chatUrl: '', hostName: '' });
    });

    it('should construct HTTP URLs for local workflows', async () => {
      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071/runtime/webhooks/workflow/api/management',
        mockHttpClient as any,
        'client-id',
        'tenant-id'
      );

      expect(result.agentUrl).toBe('http://localhost:7071/api/Agents/myWorkflow');
      expect(result.chatUrl).toBe('http://localhost:7071/api/agentsChat/myWorkflow/IFrame');
      expect(result.hostName).toBe('http://localhost:7071/runtime/webhooks/workflow/api/management');
    });

    it('should construct HTTPS URLs when defaultHostName is provided', async () => {
      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071',
        mockHttpClient as any,
        'client-id',
        'tenant-id',
        false,
        'myapp.azurewebsites.net'
      );

      expect(result.agentUrl).toBe('https://myapp.azurewebsites.net/api/Agents/myWorkflow');
      expect(result.chatUrl).toBe('https://myapp.azurewebsites.net/api/agentsChat/myWorkflow/IFrame');
      expect(result.hostName).toBe('myapp.azurewebsites.net');
    });

    it('should handle defaultHostName that already includes https://', async () => {
      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071',
        mockHttpClient as any,
        'client-id',
        'tenant-id',
        false,
        'https://myapp.azurewebsites.net'
      );

      expect(result.agentUrl).toBe('https://myapp.azurewebsites.net/api/Agents/myWorkflow');
      expect(result.hostName).toBe('https://myapp.azurewebsites.net');
    });

    it('should include auth key in queryParams when available', async () => {
      mockHttpClient.post.mockResolvedValue({ key: 'my-auth-key' });

      const result = await fetchAgentUrl('myWorkflow', 'http://localhost:7071', mockHttpClient as any, 'client-id', 'tenant-id');

      expect(result.queryParams).toEqual({ apiKey: 'my-auth-key' });
    });

    it('should handle errors gracefully and return fallback URLs', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      const result = await fetchAgentUrl('myWorkflow', 'http://localhost:7071', mockHttpClient as any, 'client-id', 'tenant-id');

      expect(result.agentUrl).toBe('');
      expect(result.hostName).toBe('http://localhost:7071');
    });

    it('should return defaultHostName in error fallback when provided', async () => {
      mockHttpClient.post.mockRejectedValue(new Error('Network error'));

      const result = await fetchAgentUrl(
        'myWorkflow',
        'http://localhost:7071',
        mockHttpClient as any,
        'client-id',
        'tenant-id',
        false,
        'myapp.azurewebsites.net'
      );

      expect(result.hostName).toBe('myapp.azurewebsites.net');
    });
  });
});
