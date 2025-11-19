import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useChatStore } from '../chatStore';
import type { ChatHistoryStorage } from '../../../storage/history-storage';
import type { ChatSession, Message as StorageMessage } from '../../../api/history-types';

describe('ChatStore - Storage Integration', () => {
  let mockStorage: ChatHistoryStorage;

  beforeEach(() => {
    // Create mock storage implementation
    mockStorage = {
      listSessions: vi.fn(),
      createSession: vi.fn(),
      getSession: vi.fn(),
      updateSession: vi.fn(),
      deleteSession: vi.fn(),
      listMessages: vi.fn(),
      addMessage: vi.fn(),
      clear: vi.fn(),
    };
  });

  describe('Storage Initialization', () => {
    it('should initialize with storage instance', () => {
      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      expect(result.current.storage).toBe(mockStorage);
    });

    it('should load sessions after initializing storage', async () => {
      const mockSessions: ChatSession[] = [
        {
          id: 'session-1',
          name: 'Test Session',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        },
      ];

      (mockStorage.listSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSessions);

      const { result } = renderHook(() => useChatStore());

      await act(async () => {
        result.current.initializeStorage(mockStorage);
        await result.current.loadSessions();
      });

      expect(result.current.sessions).toEqual(mockSessions);
      expect(mockStorage.listSessions).toHaveBeenCalled();
    });
  });

  describe('Session Management', () => {
    it('should load sessions from storage', async () => {
      const mockSessions: ChatSession[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-01-02'),
        },
        {
          id: 'session-2',
          name: 'Session 2',
          createdAt: new Date('2025-01-03'),
          updatedAt: new Date('2025-01-04'),
        },
      ];

      (mockStorage.listSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockSessions);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(result.current.sessions).toEqual(mockSessions);
      expect(result.current.sessionsLoading).toBe(false);
      expect(result.current.sessionsError).toBeNull();
    });

    it('should set loading state while loading sessions', async () => {
      let resolveListSessions: (value: ChatSession[]) => void;
      const listSessionsPromise = new Promise<ChatSession[]>((resolve) => {
        resolveListSessions = resolve;
      });

      (mockStorage.listSessions as ReturnType<typeof vi.fn>).mockReturnValue(listSessionsPromise);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      // Start loading (don't await yet)
      const loadPromise = result.current.loadSessions();

      // Give state a moment to update
      await act(async () => {
        await Promise.resolve();
      });

      // Check loading state while promise is pending
      expect(result.current.sessionsLoading).toBe(true);

      // Resolve the promise
      act(() => {
        resolveListSessions!([]);
      });

      await act(async () => {
        await loadPromise;
      });

      expect(result.current.sessionsLoading).toBe(false);
    });

    it('should handle errors when loading sessions', async () => {
      const error = new Error('Failed to load sessions');
      (mockStorage.listSessions as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(result.current.sessionsError).toBe('Failed to load sessions');
      expect(result.current.sessionsLoading).toBe(false);
    });

    it('should create a new session', async () => {
      const newSession: ChatSession = {
        id: 'new-session',
        name: 'New Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (mockStorage.createSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(newSession);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      await act(async () => {
        await result.current.createNewSession('New Chat');
      });

      expect(mockStorage.createSession).toHaveBeenCalledWith('New Chat');
      expect(result.current.currentSessionId).toBe('new-session');
      expect(result.current.sessions).toContainEqual(newSession);
    });

    it('should switch to a different session', async () => {
      const mockMessages: StorageMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
          timestamp: new Date(),
          contextId: 'session-2',
        },
      ];

      (mockStorage.listMessages as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMessages);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      await act(async () => {
        await result.current.switchSession('session-2');
      });

      expect(result.current.currentSessionId).toBe('session-2');
      expect(mockStorage.listMessages).toHaveBeenCalledWith('session-2');
      expect(result.current.messages).toHaveLength(1);
    });

    it('should delete a session', async () => {
      const existingSessions: ChatSession[] = [
        {
          id: 'session-1',
          name: 'Session 1',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'session-2',
          name: 'Session 2',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockStorage.listSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
        existingSessions
      );
      (mockStorage.deleteSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      await act(async () => {
        await result.current.loadSessions();
      });

      expect(result.current.sessions).toHaveLength(2);

      await act(async () => {
        await result.current.deleteSession('session-1');
      });

      expect(mockStorage.deleteSession).toHaveBeenCalledWith('session-1');
      expect(result.current.sessions).toHaveLength(1);
      expect(result.current.sessions.find((s) => s.id === 'session-1')).toBeUndefined();
    });

    it('should rename a session', async () => {
      const initialSession: ChatSession = {
        id: 'session-1',
        name: 'Old Name',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      const updatedSession: ChatSession = {
        id: 'session-1',
        name: 'Updated Name',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date(),
      };

      (mockStorage.listSessions as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        initialSession,
      ]);
      (mockStorage.updateSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(updatedSession);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      // Load the initial session
      await act(async () => {
        await result.current.loadSessions();
      });

      expect(result.current.sessions[0].name).toBe('Old Name');

      // Rename it
      await act(async () => {
        await result.current.renameSession('session-1', 'Updated Name');
      });

      expect(mockStorage.updateSession).toHaveBeenCalledWith('session-1', { name: 'Updated Name' });
      expect(result.current.sessions[0].name).toBe('Updated Name');
    });
  });

  describe('Message Persistence', () => {
    it('should load messages for a session', async () => {
      const mockMessages: StorageMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
          timestamp: new Date(),
          contextId: 'session-1',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: [{ type: 'text', text: 'Hi there!' }],
          timestamp: new Date(),
          contextId: 'session-1',
        },
      ];

      (mockStorage.listMessages as ReturnType<typeof vi.fn>).mockResolvedValueOnce(mockMessages);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      await act(async () => {
        await result.current.loadMessagesForSession('session-1');
      });

      expect(mockStorage.listMessages).toHaveBeenCalledWith('session-1');
      expect(result.current.messages).toHaveLength(2);
    });

    it('should save a message to storage when added', async () => {
      (mockStorage.addMessage as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChatStore());

      // Storage message format
      const storageMessage = {
        id: 'msg-new',
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'New message' }],
        timestamp: new Date(),
        contextId: 'session-3',
      };

      // Expected UI message format (after transformation)
      const expectedUIMessage = {
        id: 'msg-new',
        content: 'New message',
        sender: 'user',
        timestamp: storageMessage.timestamp,
        metadata: {
          contextId: storageMessage.contextId,
        },
      };

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      // Use a fresh session ID to avoid conflicts with other tests
      await act(async () => {
        const session: ChatSession = {
          id: 'session-3',
          name: 'Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        (mockStorage.createSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(session);
        await result.current.createNewSession('Test Session');
      });

      expect(result.current.currentSessionId).toBe('session-3');

      await act(async () => {
        await result.current.saveMessage(storageMessage);
      });

      expect(mockStorage.addMessage).toHaveBeenCalledWith('session-3', storageMessage);
      expect(result.current.messages).toContainEqual(expectedUIMessage);
    });

    it('should handle errors when saving messages', async () => {
      const error = new Error('Failed to save message');
      (mockStorage.addMessage as ReturnType<typeof vi.fn>).mockRejectedValueOnce(error);

      const { result } = renderHook(() => useChatStore());

      // Storage message format
      const storageMessage = {
        id: 'msg-new',
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'New message' }],
        timestamp: new Date(),
        contextId: 'session-4',
      };

      // Expected UI message format (after transformation)
      const expectedUIMessage = {
        id: 'msg-new',
        content: 'New message',
        sender: 'user',
        timestamp: storageMessage.timestamp,
        metadata: {
          contextId: storageMessage.contextId,
        },
      };

      act(() => {
        result.current.initializeStorage(mockStorage);
      });

      // Create a session first
      await act(async () => {
        const session: ChatSession = {
          id: 'session-4',
          name: 'Error Test Session',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        (mockStorage.createSession as ReturnType<typeof vi.fn>).mockResolvedValueOnce(session);
        await result.current.createNewSession('Error Test Session');
      });

      await act(async () => {
        await result.current.saveMessage(storageMessage);
      });

      // Message should still be added to local state (optimistic update)
      expect(result.current.messages).toContainEqual(expectedUIMessage);
      // But error should be captured
      expect(result.current.sessionsError).toBe('Failed to save message');
    });
  });

  describe('Clear Functionality', () => {
    it('should clear all sessions from storage', async () => {
      (mockStorage.clear as ReturnType<typeof vi.fn>).mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useChatStore());

      act(() => {
        result.current.initializeStorage(mockStorage);
        result.current.sessions = [
          {
            id: 'session-1',
            name: 'Session 1',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];
      });

      await act(async () => {
        await result.current.clearAllSessions();
      });

      expect(mockStorage.clear).toHaveBeenCalled();
      expect(result.current.sessions).toEqual([]);
      expect(result.current.currentSessionId).toBeNull();
    });
  });
});
