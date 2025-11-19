import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useA2A } from '../use-a2a';
import { useChatStore } from '../store/chatStore';
import type { AgentCard } from '../../types';

// Mock A2AClient
vi.mock('../../client/a2a-client', () => ({
  A2AClient: vi.fn().mockImplementation(() => ({
    message: {
      stream: vi.fn().mockImplementation(async function* () {
        yield {
          id: 'task-1',
          state: 'completed',
          messages: [
            {
              role: 'assistant',
              content: [{ type: 'text', content: 'Test response' }],
            },
          ],
          contextId: 'context-123',
        };
      }),
    },
    sendAuthenticationCompleted: vi.fn(),
  })),
}));

describe('useA2A - Storage Configuration', () => {
  const mockAgentCard: AgentCard = {
    url: 'https://example.com/api/agents/TestAgent',
    name: 'Test Agent',
    description: 'Test Description',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset chatStore state between tests
    const store = useChatStore.getState();
    store.initializeStorage(null as any);
    useChatStore.setState({
      storage: null,
      sessions: [],
      currentSessionId: null,
      sessionsLoading: false,
      sessionsError: null,
    });
  });

  describe('Storage Initialization', () => {
    it('should accept server storage configuration', async () => {
      const getAuthToken = vi.fn().mockResolvedValue('test-token');

      const { result } = renderHook(() =>
        useA2A({
          storageConfig: {
            type: 'server',
            agentUrl: 'https://example.com/api/agents/TestAgent',
            getAuthToken,
          },
        })
      );

      await act(async () => {
        await result.current.connect(mockAgentCard);
      });

      // Verify storage was initialized in the store
      const storeState = useChatStore.getState();
      expect(storeState.storage).toBeDefined();
      expect(storeState.storage).not.toBeNull();
    });

    it('should not initialize storage when no config provided', async () => {
      const { result } = renderHook(() => useA2A());

      await act(async () => {
        await result.current.connect(mockAgentCard);
      });

      // Storage should not be initialized
      const storeState = useChatStore.getState();
      expect(storeState.storage).toBeNull();
    });

    it('should use agentUrl from storageConfig', async () => {
      const getAuthToken = vi.fn().mockResolvedValue('test-token');
      const storageAgentUrl = 'https://storage.example.com/api/agents/StorageAgent';

      const { result } = renderHook(() =>
        useA2A({
          storageConfig: {
            type: 'server',
            agentUrl: storageAgentUrl,
            getAuthToken,
          },
        })
      );

      await act(async () => {
        await result.current.connect(mockAgentCard);
      });

      const storeState = useChatStore.getState();
      expect(storeState.storage).toBeDefined();
    });

    it('should fallback to agentCard URL if storageConfig agentUrl not provided', async () => {
      const getAuthToken = vi.fn().mockResolvedValue('test-token');

      const { result } = renderHook(() =>
        useA2A({
          storageConfig: {
            type: 'server',
            // No agentUrl specified, should use from agentCard
            getAuthToken,
          },
        })
      );

      await act(async () => {
        await result.current.connect(mockAgentCard);
      });

      const storeState = useChatStore.getState();
      expect(storeState.storage).toBeDefined();
    });

    it('should support optional timeout configuration', async () => {
      const getAuthToken = vi.fn().mockResolvedValue('test-token');

      const { result } = renderHook(() =>
        useA2A({
          storageConfig: {
            type: 'server',
            agentUrl: 'https://example.com/api/agents/TestAgent',
            getAuthToken,
            timeout: 60000,
          },
        })
      );

      await act(async () => {
        await result.current.connect(mockAgentCard);
      });

      const storeState = useChatStore.getState();
      expect(storeState.storage).toBeDefined();
    });
  });

  describe('Backward Compatibility', () => {
    it('should still support persistSession with localStorage when no storageConfig', async () => {
      const sessionKey = 'test-session';

      const { result } = renderHook(() =>
        useA2A({
          persistSession: true,
          sessionKey,
        })
      );

      await act(async () => {
        await result.current.connect(mockAgentCard);
      });

      // Should work with old localStorage approach
      expect(result.current.isConnected).toBe(true);

      // Storage should not be initialized (backward compatibility)
      const storeState = useChatStore.getState();
      expect(storeState.storage).toBeNull();
    });

    it('should prioritize storageConfig over persistSession', async () => {
      const getAuthToken = vi.fn().mockResolvedValue('test-token');

      const { result } = renderHook(() =>
        useA2A({
          persistSession: true,
          sessionKey: 'test-session',
          storageConfig: {
            type: 'server',
            agentUrl: 'https://example.com/api/agents/TestAgent',
            getAuthToken,
          },
        })
      );

      await act(async () => {
        await result.current.connect(mockAgentCard);
      });

      // Storage should be initialized (new approach takes precedence)
      const storeState = useChatStore.getState();
      expect(storeState.storage).toBeDefined();
      expect(storeState.storage).not.toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle storage initialization errors gracefully', async () => {
      // Mock console.error to avoid noise in test output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() =>
        useA2A({
          storageConfig: {
            type: 'browser' as any, // Not yet implemented
          },
        })
      );

      // The error should be caught in useEffect and logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[useA2A] Failed to initialize storage:',
        expect.any(Error)
      );

      // Storage should not be initialized
      const storeState = useChatStore.getState();
      expect(storeState.storage).toBeNull();

      // Connect should still work (storage is optional)
      await act(async () => {
        await result.current.connect(mockAgentCard);
      });

      expect(result.current.isConnected).toBe(true);

      consoleErrorSpy.mockRestore();
    });
  });
});
