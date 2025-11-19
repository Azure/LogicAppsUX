import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServerHistoryStorage } from './server-history-storage';
import type { ServerContext, ServerTask } from '../api/history-types';

// Mock the API module
vi.mock('../api/history-api', () => ({
  createHistoryApi: vi.fn(() => ({
    listContexts: vi.fn(),
    listTasks: vi.fn(),
    updateContext: vi.fn(),
  })),
}));

describe('ServerHistoryStorage', () => {
  let storage: ServerHistoryStorage;
  let mockApi: {
    listContexts: ReturnType<typeof vi.fn>;
    listTasks: ReturnType<typeof vi.fn>;
    updateContext: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();

    // Create storage instance
    storage = new ServerHistoryStorage({
      agentUrl: 'https://example.com/api/agents/TestAgent',
      apiKey: 'test-api-key',
      oboUserToken: 'test-obo-token',
    });

    // Get reference to mocked API
    const { createHistoryApi } = await import('../api/history-api');
    mockApi = (createHistoryApi as ReturnType<typeof vi.fn>).mock.results[0].value;
  });

  describe('listSessions', () => {
    it('should fetch and transform contexts from server', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'context-1',
          name: 'Test Chat',
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 1:00:00 PM',
          status: 'Running',
        },
        {
          id: 'context-2',
          isArchived: false,
          createdAt: '10/29/2025 11:00:00 AM',
          updatedAt: '10/29/2025 12:00:00 PM',
          status: 'Running',
        },
      ];

      mockApi.listContexts.mockResolvedValueOnce(mockContexts);

      const sessions = await storage.listSessions();

      expect(sessions).toHaveLength(2);
      expect(sessions[0].id).toBe('context-1');
      expect(sessions[0].name).toBe('Test Chat');
      expect(sessions[1].id).toBe('context-2');
      expect(sessions[1].name).toBe('context-2'); // Fallback to id

      // Should call API with correct params
      expect(mockApi.listContexts).toHaveBeenCalledWith({
        limit: 20,
        includeArchived: false,
        includeLastTask: true,
      });
    });

    it('should sort sessions by updatedAt descending', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'old-context',
          isArchived: false,
          createdAt: '10/29/2025 10:00:00 AM',
          updatedAt: '10/29/2025 10:30:00 AM', // Older
          status: 'Running',
        },
        {
          id: 'new-context',
          isArchived: false,
          createdAt: '10/29/2025 11:00:00 AM',
          updatedAt: '10/29/2025 2:00:00 PM', // Newer
          status: 'Running',
        },
      ];

      mockApi.listContexts.mockResolvedValueOnce(mockContexts);

      const sessions = await storage.listSessions();

      // Should be sorted newest first
      expect(sessions[0].id).toBe('new-context');
      expect(sessions[1].id).toBe('old-context');
    });

    it('should respect limit option', async () => {
      mockApi.listContexts.mockResolvedValueOnce([]);

      await storage.listSessions({ limit: 50 });

      expect(mockApi.listContexts).toHaveBeenCalledWith({
        limit: 50,
        includeArchived: false,
        includeLastTask: true,
      });
    });

    it('should respect includeArchived option', async () => {
      mockApi.listContexts.mockResolvedValueOnce([]);

      await storage.listSessions({ includeArchived: true });

      expect(mockApi.listContexts).toHaveBeenCalledWith({
        limit: 20,
        includeArchived: true,
        includeLastTask: true,
      });
    });

    it('should cache fetched sessions', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'context-1',
          name: 'Test',
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 1:00:00 PM',
          status: 'Running',
        },
      ];

      mockApi.listContexts.mockResolvedValueOnce(mockContexts);

      await storage.listSessions();

      // Should be cached now
      const session = await storage.getSession('context-1');
      expect(session).not.toBeNull();
      expect(session?.name).toBe('Test');

      // Should not call API again
      expect(mockApi.listContexts).toHaveBeenCalledTimes(1);
    });
  });

  describe('createSession', () => {
    it('should create a pending session with provided name', async () => {
      const session = await storage.createSession('My New Chat');

      expect(session.id).toMatch(/^pending-\d+$/);
      expect(session.name).toBe('My New Chat');
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a pending session with default name', async () => {
      const session = await storage.createSession();

      expect(session.name).toBe('New Chat');
    });

    it('should cache the pending session', async () => {
      const session = await storage.createSession('Test');

      const retrieved = await storage.getSession(session.id);
      expect(retrieved).toEqual(session);
    });
  });

  describe('getSession', () => {
    it('should return session from cache if available', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'cached-context',
          name: 'Cached',
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 1:00:00 PM',
          status: 'Running',
        },
      ];

      mockApi.listContexts.mockResolvedValueOnce(mockContexts);

      await storage.listSessions(); // Cache it

      const session = await storage.getSession('cached-context');

      expect(session).not.toBeNull();
      expect(session?.name).toBe('Cached');
      // Should only call listSessions once (no additional call)
      expect(mockApi.listContexts).toHaveBeenCalledTimes(1);
    });

    it('should fetch from server if not in cache', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'server-context',
          name: 'Server',
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 1:00:00 PM',
          status: 'Running',
        },
      ];

      mockApi.listContexts.mockResolvedValueOnce(mockContexts);

      const session = await storage.getSession('server-context');

      expect(session).not.toBeNull();
      expect(session?.name).toBe('Server');
      expect(mockApi.listContexts).toHaveBeenCalled();
    });

    it('should return null if session not found', async () => {
      mockApi.listContexts.mockResolvedValueOnce([]);

      const session = await storage.getSession('nonexistent');

      expect(session).toBeNull();
    });
  });

  describe('updateSession', () => {
    it('should update session name', async () => {
      const mockUpdatedContext: ServerContext = {
        id: 'context-1',
        name: 'Updated Name',
        isArchived: false,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 2:00:00 PM',
        status: 'Running',
      };

      mockApi.updateContext.mockResolvedValueOnce(mockUpdatedContext);

      const updated = await storage.updateSession('context-1', {
        name: 'Updated Name',
      });

      expect(updated.name).toBe('Updated Name');
      expect(mockApi.updateContext).toHaveBeenCalledWith({
        Id: 'context-1',
        Name: 'Updated Name',
      });
    });

    it('should update cache after update', async () => {
      const mockUpdatedContext: ServerContext = {
        id: 'context-1',
        name: 'Updated',
        isArchived: false,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 2:00:00 PM',
        status: 'Running',
      };

      mockApi.updateContext.mockResolvedValueOnce(mockUpdatedContext);

      await storage.updateSession('context-1', { name: 'Updated' });

      // Should be in cache now
      const session = await storage.getSession('context-1');
      expect(session?.name).toBe('Updated');
    });
  });

  describe('deleteSession', () => {
    it('should archive the session on server', async () => {
      mockApi.updateContext.mockResolvedValueOnce({
        id: 'context-1',
        isArchived: true,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 2:00:00 PM',
        status: 'Running',
      });

      await storage.deleteSession('context-1');

      expect(mockApi.updateContext).toHaveBeenCalledWith({
        Id: 'context-1',
        IsArchived: true,
      });
    });

    it('should remove session from cache', async () => {
      // Cache a session first
      const mockContexts: ServerContext[] = [
        {
          id: 'context-1',
          name: 'To Delete',
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 1:00:00 PM',
          status: 'Running',
        },
      ];

      mockApi.listContexts.mockResolvedValueOnce(mockContexts);
      await storage.listSessions();

      // Verify it's in cache
      let session = await storage.getSession('context-1');
      expect(session).not.toBeNull();

      // Delete it
      mockApi.updateContext.mockResolvedValueOnce({
        id: 'context-1',
        isArchived: true,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 2:00:00 PM',
        status: 'Running',
      });

      await storage.deleteSession('context-1');

      // Should be removed from cache
      // Now when we try to get it, it should fetch from server and return empty
      mockApi.listContexts.mockResolvedValueOnce([]);
      session = await storage.getSession('context-1');
      expect(session).toBeNull();
    });
  });

  describe('listMessages', () => {
    it('should fetch and transform tasks from server', async () => {
      const mockTasks: ServerTask[] = [
        {
          id: 'task-1',
          contextId: 'context-1',
          taskStatus: {
            state: 'completed',
            message: {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response' }],
              metadata: { timestamp: '10/29/2025 1:01:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 1:01:05 PM',
          },
          status: {
            state: 'completed',
            message: {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response' }],
              metadata: { timestamp: '10/29/2025 1:01:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 1:01:05 PM',
          },
          history: [
            {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response' }],
              metadata: { timestamp: '10/29/2025 1:01:00 PM' },
              kind: 'message',
            },
            {
              messageId: 'msg-1',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Query' }],
              metadata: { timestamp: '10/29/2025 1:00:00 PM' },
              kind: 'message',
            },
          ],
          kind: 'task',
        },
      ];

      mockApi.listTasks.mockResolvedValueOnce(mockTasks);

      const messages = await storage.listMessages('context-1');

      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant'); // Transformed from 'agent'
      expect(mockApi.listTasks).toHaveBeenCalledWith('context-1');
    });

    it('should cache messages', async () => {
      const mockTasks: ServerTask[] = [];
      mockApi.listTasks.mockResolvedValueOnce(mockTasks);

      await storage.listMessages('context-1');
      await storage.listMessages('context-1'); // Second call

      // Should only call API once
      expect(mockApi.listTasks).toHaveBeenCalledTimes(1);
    });
  });

  describe('addMessage', () => {
    it('should optimistically update message cache', async () => {
      // First, fetch messages to populate cache
      mockApi.listTasks.mockResolvedValueOnce([]);
      await storage.listMessages('context-1');

      // Now add a message
      const newMessage = {
        id: 'msg-new',
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'New message' }],
        timestamp: new Date(),
        contextId: 'context-1',
      };

      await storage.addMessage('context-1', newMessage);

      // Should be in cache now (optimistic update)
      const messages = await storage.listMessages('context-1');
      expect(messages).toContainEqual(newMessage);
    });
  });

  describe('clear', () => {
    it('should archive all sessions', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'context-1',
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 1:00:00 PM',
          status: 'Running',
        },
        {
          id: 'context-2',
          isArchived: false,
          createdAt: '10/29/2025 11:00:00 AM',
          updatedAt: '10/29/2025 12:00:00 PM',
          status: 'Running',
        },
      ];

      mockApi.listContexts.mockResolvedValueOnce(mockContexts);
      mockApi.updateContext.mockResolvedValue({
        id: 'context-1',
        isArchived: true,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 2:00:00 PM',
        status: 'Running',
      });

      await storage.clear();

      expect(mockApi.updateContext).toHaveBeenCalledTimes(2);
      expect(mockApi.updateContext).toHaveBeenCalledWith({
        Id: 'context-1',
        IsArchived: true,
      });
      expect(mockApi.updateContext).toHaveBeenCalledWith({
        Id: 'context-2',
        IsArchived: true,
      });
    });
  });

  describe('cache management', () => {
    it('should invalidate specific session cache', async () => {
      const mockContexts: ServerContext[] = [
        {
          id: 'context-1',
          name: 'Test',
          isArchived: false,
          createdAt: '10/29/2025 12:00:00 AM',
          updatedAt: '10/29/2025 1:00:00 PM',
          status: 'Running',
        },
      ];

      mockApi.listContexts.mockResolvedValue(mockContexts);

      await storage.listSessions();
      storage.invalidateCache('context-1');

      // Should fetch from server again
      await storage.getSession('context-1');
      expect(mockApi.listContexts).toHaveBeenCalledTimes(2);
    });

    it('should clear all caches', async () => {
      mockApi.listContexts.mockResolvedValue([]);
      mockApi.listTasks.mockResolvedValue([]);

      await storage.listSessions();
      await storage.listMessages('context-1');

      storage.clearCache();

      // Should fetch from server again
      await storage.listSessions();
      await storage.listMessages('context-1');

      expect(mockApi.listContexts).toHaveBeenCalledTimes(2);
      expect(mockApi.listTasks).toHaveBeenCalledTimes(2);
    });
  });
});
