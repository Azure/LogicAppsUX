import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createHistoryApi, type HistoryApiConfig } from './history-api';
import type { ServerContext, ServerTask } from './history-types';

describe('History API Client', () => {
  const mockAgentUrl = 'https://example.com/api/agents/TestAgent';
  const mockApiKey = 'test-api-key-123';
  const mockOboToken = 'test-obo-token-456';

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const createMockConfig = (overrides?: Partial<HistoryApiConfig>): HistoryApiConfig => ({
    agentUrl: mockAgentUrl,
    apiKey: mockApiKey,
    ...overrides,
  });

  const createMockResponse = (result: unknown) => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({
      jsonrpc: '2.0',
      id: 'test-id',
      result,
    }),
  });

  describe('listContexts', () => {
    it('should fetch contexts with default parameters', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'context-1',
          name: 'Test Chat',
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 12:30:00 AM',
          status: 'Running',
        },
      ];

      fetchMock.mockResolvedValueOnce(createMockResponse(mockContexts));

      const api = createHistoryApi(createMockConfig());
      const result = await api.listContexts();

      expect(result).toEqual(mockContexts);
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(fetchMock).toHaveBeenCalledWith(
        mockAgentUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-API-Key': mockApiKey,
          }),
        })
      );

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.method).toBe('contexts/list');
      expect(requestBody.jsonrpc).toBe('2.0');
    });

    it('should pass parameters to contexts/list', async () => {
      const mockContexts: ServerContext[] = [];
      fetchMock.mockResolvedValueOnce(createMockResponse(mockContexts));

      const api = createHistoryApi(createMockConfig());
      await api.listContexts({
        limit: 10,
        includeLastTask: true,
        includeArchived: false,
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.params).toEqual({
        limit: 10,
        includeLastTask: true,
        includeArchived: false,
      });
    });

    it('should work without API key', async () => {
      const mockContexts: ServerContext[] = [];
      fetchMock.mockResolvedValueOnce(createMockResponse(mockContexts));

      const api = createHistoryApi({
        agentUrl: mockAgentUrl,
        // No apiKey provided
      });

      await api.listContexts();

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['X-API-Key']).toBeUndefined();
    });

    it('should include OBO token header when provided', async () => {
      const mockContexts: ServerContext[] = [];
      fetchMock.mockResolvedValueOnce(createMockResponse(mockContexts));

      const api = createHistoryApi({
        agentUrl: mockAgentUrl,
        apiKey: mockApiKey,
        oboUserToken: mockOboToken,
      });

      await api.listContexts();

      const headers = fetchMock.mock.calls[0][1].headers;
      expect(headers['X-API-Key']).toBe(mockApiKey);
      expect(headers['x-ms-obo-userToken']).toBe(`Key ${mockOboToken}`);
    });

    it('should handle contexts without name field', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'context-1',
          // name is optional
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 12:30:00 AM',
          status: 'Running',
        },
      ];

      fetchMock.mockResolvedValueOnce(createMockResponse(mockContexts));

      const api = createHistoryApi(createMockConfig());
      const result = await api.listContexts();

      expect(result[0].name).toBeUndefined();
    });

    it('should throw error on HTTP error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const api = createHistoryApi(createMockConfig());

      await expect(api.listContexts()).rejects.toThrow('HTTP error 500');
    });

    it('should throw error on JSON-RPC error', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          jsonrpc: '2.0',
          id: 'test-id',
          error: {
            code: 'MethodNotFound',
            message: 'Method not found',
          },
        }),
      });

      const api = createHistoryApi(createMockConfig());

      await expect(api.listContexts()).rejects.toThrow('JSON-RPC error MethodNotFound');
    });
  });

  describe('listTasks', () => {
    it('should fetch tasks for a context', async () => {
      const mockTasks: ServerTask[] = [
        {
          id: 'task-1_context-1',
          contextId: 'context-1',
          taskStatus: {
            state: 'completed',
            message: {
              messageId: 'msg-1',
              taskId: 'task-1_context-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Hello' }],
              metadata: { timestamp: '10/29/2025 12:00:00 AM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:00:05 AM',
          },
          status: {
            state: 'completed',
            message: {
              messageId: 'msg-1',
              taskId: 'task-1_context-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Hello' }],
              metadata: { timestamp: '10/29/2025 12:00:00 AM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:00:05 AM',
          },
          history: [
            {
              messageId: 'msg-1',
              taskId: 'task-1_context-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Hello' }],
              metadata: { timestamp: '10/29/2025 12:00:00 AM' },
              kind: 'message',
            },
            {
              messageId: 'msg-2',
              taskId: 'task-1_context-1',
              contextId: 'context-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Hi' }],
              metadata: { timestamp: '10/29/2025 11:59:55 AM' },
              kind: 'message',
            },
          ],
          kind: 'task',
        },
      ];

      fetchMock.mockResolvedValueOnce(createMockResponse(mockTasks));

      const api = createHistoryApi(createMockConfig());
      const result = await api.listTasks('context-1');

      expect(result).toEqual(mockTasks);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.method).toBe('tasks/list');
      expect(requestBody.params).toEqual({ Id: 'context-1' }); // Note: capital 'I'
    });

    it('should validate lowercase enum values', async () => {
      const mockTasks: ServerTask[] = [
        {
          id: 'task-1_context-1',
          contextId: 'context-1',
          taskStatus: {
            state: 'completed',
            message: {
              messageId: 'msg-1',
              taskId: 'task-1_context-1',
              contextId: 'context-1',
              role: 'agent', // lowercase
              parts: [{ kind: 'text', text: 'Hello' }], // lowercase
              metadata: { timestamp: '10/29/2025 12:00:00 AM' },
              kind: 'message', // lowercase
            },
            timestamp: '10/29/2025 12:00:05 AM',
          },
          status: {
            state: 'completed',
            message: {
              messageId: 'msg-1',
              taskId: 'task-1_context-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Hello' }],
              metadata: { timestamp: '10/29/2025 12:00:00 AM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:00:05 AM',
          },
          history: [],
          kind: 'task', // lowercase
        },
      ];

      fetchMock.mockResolvedValueOnce(createMockResponse(mockTasks));

      const api = createHistoryApi(createMockConfig());
      const result = await api.listTasks('context-1');

      expect(result[0].kind).toBe('task');
      expect(result[0].taskStatus.message.role).toBe('agent');
      expect(result[0].taskStatus.message.kind).toBe('message');
    });
  });

  describe('updateContext', () => {
    it('should update context name', async () => {
      const mockUpdatedContext: ServerContext = {
        id: 'context-1',
        name: 'New Name',
        isArchived: false,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 13:00:00 AM',
        status: 'Running',
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockUpdatedContext));

      const api = createHistoryApi(createMockConfig());
      const result = await api.updateContext({
        Id: 'context-1',
        Name: 'New Name',
      });

      expect(result).toEqual(mockUpdatedContext);

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      expect(requestBody.method).toBe('context/update'); // Singular!
      expect(requestBody.params).toEqual({
        Id: 'context-1',
        Name: 'New Name',
      });
    });

    it('should use singular "context/update" method name', async () => {
      const mockUpdatedContext: ServerContext = {
        id: 'context-1',
        isArchived: true,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 13:00:00 AM',
        status: 'Running',
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockUpdatedContext));

      const api = createHistoryApi(createMockConfig());
      await api.updateContext({
        Id: 'context-1',
        IsArchived: true,
      });

      const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      // CRITICAL: Must be singular "context/update", not "contexts/update"
      expect(requestBody.method).toBe('context/update');
    });

    it('should archive a context', async () => {
      const mockUpdatedContext: ServerContext = {
        id: 'context-1',
        isArchived: true,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 13:00:00 AM',
        status: 'Running',
      };

      fetchMock.mockResolvedValueOnce(createMockResponse(mockUpdatedContext));

      const api = createHistoryApi(createMockConfig());
      const result = await api.updateContext({
        Id: 'context-1',
        IsArchived: true,
      });

      expect(result.isArchived).toBe(true);
    });
  });

  describe('timeout handling', () => {
    it('should timeout after configured duration', async () => {
      // Mock a slow response that checks the abort signal
      fetchMock.mockImplementationOnce(
        (_url, options) =>
          new Promise((resolve, reject) => {
            const signal = options?.signal as AbortSignal | undefined;

            // Listen for abort
            if (signal) {
              signal.addEventListener('abort', () => {
                const error = new Error('The operation was aborted');
                error.name = 'AbortError';
                reject(error);
              });
            }

            // Simulate slow response (never resolves before abort)
            setTimeout(() => resolve(createMockResponse([])), 1000);
          })
      );

      const api = createHistoryApi(
        createMockConfig({
          timeout: 10, // Very short timeout (10ms)
        })
      );

      await expect(api.listContexts()).rejects.toThrow('Request timeout');
    });
  });

  describe('request ID generation', () => {
    it('should generate unique request IDs', async () => {
      fetchMock.mockResolvedValue(createMockResponse([]));

      const api = createHistoryApi(createMockConfig());

      await api.listContexts();
      await api.listContexts();

      const firstRequestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
      const secondRequestBody = JSON.parse(fetchMock.mock.calls[1][1].body);

      expect(firstRequestBody.id).toBeDefined();
      expect(secondRequestBody.id).toBeDefined();
      expect(firstRequestBody.id).not.toBe(secondRequestBody.id);
    });
  });
});
