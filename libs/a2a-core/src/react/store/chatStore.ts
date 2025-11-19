import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type { Message, Attachment } from '../types';
import type {
  AuthRequiredEvent,
  AuthConfig,
  AuthRequiredHandler,
  UnauthorizedHandler,
} from '../../client/types';
import type { ChatHistoryStorage } from '../../storage/history-storage';
import type { ChatSession, Message as StorageMessage } from '../../api/history-types';
import { transformStorageMessagesToUI } from '../utils/message-transformer';
import { A2AClient } from '../../client/a2a-client';
import type { AgentCard, Part as A2APart } from '../../types';

// Enable MapSet plugin for Immer to handle Maps
enableMapSet();

// Connection configuration for a session
interface SessionConnectionConfig {
  agentCard: AgentCard;
  auth?: AuthConfig;
  apiKey?: string;
  oboUserToken?: string;
  onAuthRequired?: AuthRequiredHandler;
  onUnauthorized?: UnauthorizedHandler;
  streamTimeoutMs?: number;
}

interface ChatState {
  messages: Message[];
  isConnected: boolean;
  isTyping: boolean;
  pendingUploads: Map<string, Attachment>;
  authRequired: AuthRequiredEvent | null;

  // Session-specific states
  typingByContext: Map<string, boolean>;
  authRequiredByContext: Map<string, AuthRequiredEvent | null>;

  // Storage and session management
  storage: ChatHistoryStorage | null;
  sessions: ChatSession[];
  currentSessionId: string | null;
  sessionsLoading: boolean;
  sessionsError: string | null;

  // Connection management - manages SSE connections per session
  activeConnections: Map<string, A2AClient>;
  sessionMessages: Map<string, Message[]>;
  connectingSessionIds: Set<string>;
  sessionConfigs: Map<string, SessionConnectionConfig>;

  // Unread message tracking
  unreadCounts: Map<string, number>;
  viewedSessionId: string | null; // Currently viewed session (for unread tracking)

  // Session migration tracking
  lastMigration: { from: string; to: string; suggestedName?: string } | null; // Track last pending->real migration for UI updates

  // Actions
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  setMessages: (messages: Message[]) => void;
  setConnected: (connected: boolean) => void;
  setTyping: (typing: boolean, contextId?: string) => void;
  setAuthRequired: (event: AuthRequiredEvent | null, contextId?: string) => void;

  // File upload actions
  addPendingUpload: (attachment: Attachment) => void;
  updatePendingUpload: (id: string, updates: Partial<Attachment>) => void;
  removePendingUpload: (id: string) => void;

  // Storage and session management actions
  initializeStorage: (storage: ChatHistoryStorage) => void;
  loadSessions: () => Promise<void>;
  createNewSession: (name?: string) => Promise<void>;
  switchSession: (sessionId: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  renameSession: (sessionId: string, name: string) => Promise<void>;
  loadMessagesForSession: (sessionId: string) => Promise<void>;
  saveMessage: (message: StorageMessage) => Promise<void>;
  clearAllSessions: () => Promise<void>;

  // Connection management actions
  startSessionStream: (sessionId: string, config: SessionConnectionConfig) => Promise<void>;
  stopSessionStream: (sessionId: string) => void;
  sendMessageToSession: (sessionId: string, content: string) => Promise<void>;
  getMessagesForSession: (sessionId: string) => Message[];

  // Utilities
  clearMessages: () => void;

  // Getters for session-specific states
  getIsTypingForContext: (contextId: string | undefined) => boolean;
  getAuthRequiredForContext: (contextId: string | undefined) => AuthRequiredEvent | null;

  // Unread message actions
  markSessionAsRead: (sessionId: string) => void;
  incrementUnreadCount: (sessionId: string) => void;
  setViewedSession: (sessionId: string | null) => void;

  // Session migration
  migratePendingSessionToRealId: (pendingSessionId: string, realContextId: string) => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  immer((set, get) => ({
    messages: [],
    isConnected: false,
    lastMigration: null,
    isTyping: false,
    pendingUploads: new Map(),
    authRequired: null,
    typingByContext: new Map(),
    authRequiredByContext: new Map(),

    // Storage and session state
    storage: null,
    sessions: [],
    currentSessionId: null,
    sessionsLoading: false,
    sessionsError: null,

    // Connection management state
    activeConnections: new Map(),
    sessionMessages: new Map(),
    connectingSessionIds: new Set(),
    sessionConfigs: new Map(),

    // Unread message tracking state
    unreadCounts: new Map(),
    viewedSessionId: null,

    addMessage: (message) =>
      set((state) => {
        state.messages.push(message);
      }),

    updateMessage: (id, updates) =>
      set((state) => {
        const messageIndex = state.messages.findIndex((msg) => msg.id === id);
        if (messageIndex !== -1) {
          Object.assign(state.messages[messageIndex], updates);
        }
      }),

    deleteMessage: (id) =>
      set((state) => {
        const index = state.messages.findIndex((msg) => msg.id === id);
        if (index !== -1) {
          state.messages.splice(index, 1);
        }
      }),

    setMessages: (messages) => set({ messages }),

    setConnected: (connected) => set({ isConnected: connected }),

    setTyping: (typing, contextId) =>
      set((state) => {
        let newTypingByContext = state.typingByContext;
        if (contextId) {
          // Create a new Map to avoid Immer issues
          newTypingByContext = new Map(state.typingByContext);
          newTypingByContext.set(contextId, typing);
        }
        return {
          isTyping: typing,
          typingByContext: newTypingByContext,
        };
      }),

    setAuthRequired: (event, contextId) =>
      set((state) => {
        let newAuthRequiredByContext = state.authRequiredByContext;
        if (contextId) {
          // Create a new Map to avoid Immer issues
          newAuthRequiredByContext = new Map(state.authRequiredByContext);
          newAuthRequiredByContext.set(contextId, event);
        }
        return {
          authRequired: event,
          authRequiredByContext: newAuthRequiredByContext,
        };
      }),

    addPendingUpload: (attachment) =>
      set((state) => {
        const newUploads = new Map(state.pendingUploads);
        newUploads.set(attachment.id, attachment);
        return { pendingUploads: newUploads };
      }),

    updatePendingUpload: (id, updates) =>
      set((state) => {
        const newUploads = new Map(state.pendingUploads);
        const existing = newUploads.get(id);
        if (existing) {
          newUploads.set(id, { ...existing, ...updates });
        }
        return { pendingUploads: newUploads };
      }),

    removePendingUpload: (id) =>
      set((state) => {
        const newUploads = new Map(state.pendingUploads);
        newUploads.delete(id);
        return { pendingUploads: newUploads };
      }),

    clearMessages: () => set({ messages: [] }),

    // Storage and session management actions
    initializeStorage: (storage: ChatHistoryStorage) => {
      console.log('[chatStore] initializeStorage called');
      set({ storage });
    },

    loadSessions: async () => {
      const { storage } = get();
      console.log('[chatStore] loadSessions called, storage:', storage ? 'present' : 'null');
      if (!storage) {
        console.log('[chatStore] No storage available, skipping loadSessions');
        return;
      }

      set({ sessionsLoading: true, sessionsError: null });
      console.log('[chatStore] Calling storage.listSessions()...');

      try {
        const sessions = await storage.listSessions();
        console.log('[chatStore] Loaded sessions from storage:', sessions.length, 'sessions');
        set({ sessions, sessionsLoading: false });
      } catch (error) {
        console.error('[chatStore] Error loading sessions:', error);
        set({
          sessionsError: error instanceof Error ? error.message : 'Unknown error',
          sessionsLoading: false,
        });
      }
    },

    createNewSession: async (name?: string) => {
      const { storage } = get();
      if (!storage) return;

      try {
        const newSession = await storage.createSession(name);
        set((state) => {
          state.sessions.push(newSession);
          state.currentSessionId = newSession.id;
        });
      } catch (error) {
        set({
          sessionsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    switchSession: async (sessionId: string) => {
      const { storage } = get();
      if (!storage) return;

      try {
        const storageMessages = await storage.listMessages(sessionId);
        const uiMessages = transformStorageMessagesToUI(storageMessages);
        set({
          currentSessionId: sessionId,
          messages: uiMessages,
        });
      } catch (error) {
        set({
          sessionsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    deleteSession: async (sessionId: string) => {
      const { storage } = get();
      if (!storage) return;

      try {
        await storage.deleteSession(sessionId);
        set((state) => {
          const index = state.sessions.findIndex((s) => s.id === sessionId);
          if (index !== -1) {
            state.sessions.splice(index, 1);
          }
        });
      } catch (error) {
        set({
          sessionsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    renameSession: async (sessionId: string, name: string) => {
      const { storage } = get();
      if (!storage) return;

      try {
        const updatedSession = await storage.updateSession(sessionId, { name });
        set((state) => {
          const index = state.sessions.findIndex((s) => s.id === sessionId);
          if (index !== -1) {
            state.sessions[index] = updatedSession;
          }
        });
      } catch (error) {
        set({
          sessionsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    loadMessagesForSession: async (sessionId: string) => {
      const { storage } = get();
      if (!storage) return;

      try {
        const storageMessages = await storage.listMessages(sessionId);
        const uiMessages = transformStorageMessagesToUI(storageMessages);

        // Store messages in session-specific map for multi-session mode
        set((draft) => {
          const newSessionMessages = new Map(draft.sessionMessages);
          newSessionMessages.set(sessionId, uiMessages);
          return {
            sessionMessages: newSessionMessages,
            messages: uiMessages, // Also update global for backward compatibility
          };
        });
      } catch (error) {
        set({
          sessionsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    saveMessage: async (message: StorageMessage) => {
      const { storage, currentSessionId } = get();
      if (!storage || !currentSessionId) return;

      // Optimistically add to local state
      const uiMessage = transformStorageMessagesToUI([message])[0];
      set((state) => {
        state.messages.push(uiMessage);
      });

      try {
        await storage.addMessage(currentSessionId, message);
      } catch (error) {
        set({
          sessionsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    clearAllSessions: async () => {
      const { storage } = get();
      if (!storage) return;

      try {
        await storage.clear();
        set({
          sessions: [],
          currentSessionId: null,
          messages: [],
        });
      } catch (error) {
        set({
          sessionsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    getIsTypingForContext: (contextId: string | undefined): boolean => {
      if (!contextId) return false;
      const state = get();
      return state.typingByContext.get(contextId) || false;
    },

    getAuthRequiredForContext: (contextId: string | undefined): AuthRequiredEvent | null => {
      if (!contextId) return null;
      const state = get();
      return state.authRequiredByContext.get(contextId) || null;
    },

    // Connection management actions
    startSessionStream: async (sessionId: string, config: SessionConnectionConfig) => {
      const state = get();

      // Don't start if already connected
      if (state.activeConnections.has(sessionId)) {
        console.log(`[chatStore] Session ${sessionId} already has active connection`);
        return;
      }

      console.log(`[chatStore] Starting stream for session ${sessionId}`);

      set((draft) => {
        const newConnecting = new Set(draft.connectingSessionIds);
        newConnecting.add(sessionId);
        const newConfigs = new Map(draft.sessionConfigs);
        newConfigs.set(sessionId, config);
        return {
          connectingSessionIds: newConnecting,
          sessionConfigs: newConfigs,
        };
      });

      try {
        // Create A2A client with proper configuration
        const clientConfig: any = {
          agentCard: config.agentCard,
          httpOptions: {
            retries: 2,
            timeout: 30000,
          },
        };

        if (config.auth) {
          clientConfig.auth = config.auth;
        } else {
          clientConfig.auth = { type: 'cookie' };
        }

        if (config.apiKey) {
          clientConfig.apiKey = config.apiKey;
        }

        if (config.oboUserToken) {
          clientConfig.oboUserToken = config.oboUserToken;
        }

        // Create internal auth handler for OBO auth messages (separate from onAuthRequired callback)
        clientConfig.onAuthRequired = async (event: AuthRequiredEvent) => {
          console.log('[chatStore] Internal auth handler called for session', sessionId, event);

          // Use event.contextId as the actual session ID (handles migration from pending to real)
          const actualSessionId = event.contextId;
          console.log('[chatStore] Using actual session ID from event.contextId:', actualSessionId);

          // Create auth message and add to chat
          const authMessageId = `auth-${event.taskId}-${Date.now()}`;
          const authMessage: Message = {
            id: authMessageId,
            content: 'Authentication required',
            sender: 'system',
            timestamp: new Date(),
            status: 'sent',
            authEvent: {
              authParts: event.authParts,
              status: 'pending',
            },
            metadata: {
              taskId: event.taskId,
            },
          };

          // Add auth message to session messages
          // During session migration, we need to add to BOTH the pending ID and real ID
          // so the UI can display the auth message immediately
          set((draft) => {
            const newSessionMessages = new Map(draft.sessionMessages);

            // Add to the actual session ID (real context ID)
            const actualMsgs = newSessionMessages.get(actualSessionId) || [];
            newSessionMessages.set(actualSessionId, [...actualMsgs, authMessage]);

            // ALSO add to pending session ID if different (during migration window)
            if (sessionId !== actualSessionId && sessionId.startsWith('pending-')) {
              console.log(
                '[chatStore] Adding auth message to BOTH pending and real session IDs for migration'
              );
              const pendingMsgs = newSessionMessages.get(sessionId) || [];
              newSessionMessages.set(sessionId, [...pendingMsgs, authMessage]);
            }

            // Set auth required state for this context
            const newAuthRequired = new Map(draft.authRequiredByContext);
            newAuthRequired.set(event.contextId, event);

            return {
              sessionMessages: newSessionMessages,
              authRequiredByContext: newAuthRequired,
            };
          });

          // If there's a custom onAuthRequired callback (for chat session expiry), call it
          if (config.onAuthRequired) {
            console.log('[chatStore] Calling custom onAuthRequired callback');
            return config.onAuthRequired(event);
          }
        };

        if (config.onUnauthorized) {
          clientConfig.onUnauthorized = config.onUnauthorized;
        }

        console.log('[chatStore] Creating A2AClient with config:', {
          hasAuthHandler: !!clientConfig.onAuthRequired,
          hasUnauthorizedHandler: !!clientConfig.onUnauthorized,
          agentCardUrl: clientConfig.agentCard.url,
        });

        const client = new A2AClient(clientConfig);

        console.log('[chatStore] A2AClient created, checking handler:', {
          hasOnAuthRequired: !!(client as any).onAuthRequired,
        });

        console.log(`[chatStore] Connected session ${sessionId}`);

        set((draft) => {
          const newConnections = new Map(draft.activeConnections);
          newConnections.set(sessionId, client);
          const newConnecting = new Set(draft.connectingSessionIds);
          newConnecting.delete(sessionId);
          return {
            activeConnections: newConnections,
            connectingSessionIds: newConnecting,
          };
        });
      } catch (error) {
        console.error(`[chatStore] Error starting stream for session ${sessionId}:`, error);
        set((draft) => {
          const newConnecting = new Set(draft.connectingSessionIds);
          newConnecting.delete(sessionId);
          return {
            connectingSessionIds: newConnecting,
            sessionsError: error instanceof Error ? error.message : 'Failed to connect',
          };
        });
      }
    },

    stopSessionStream: (sessionId: string) => {
      const state = get();
      const client = state.activeConnections.get(sessionId);

      if (!client) {
        console.log(`[chatStore] No active connection for session ${sessionId}`);
        return;
      }

      console.log(`[chatStore] Stopping stream for session ${sessionId}`);

      // Note: A2AClient doesn't have a disconnect method - connections are stateless
      // Just remove from active connections
      set((draft) => {
        const newConnections = new Map(draft.activeConnections);
        newConnections.delete(sessionId);
        const newConfigs = new Map(draft.sessionConfigs);
        newConfigs.delete(sessionId);
        return {
          activeConnections: newConnections,
          sessionConfigs: newConfigs,
        };
      });
    },

    sendMessageToSession: async (sessionId: string, content: string) => {
      const state = get();

      // Check if this is a pending session (needs connection first)
      const isPendingSession = sessionId.startsWith('pending-');
      let client = state.activeConnections.get(sessionId);

      if (!client && isPendingSession) {
        // For pending sessions, start the connection first
        console.log(
          `[chatStore] Pending session ${sessionId} - starting connection for first message`
        );
        const sessionConfig = state.sessionConfigs.get(sessionId);
        if (sessionConfig) {
          await get().startSessionStream(sessionId, sessionConfig);
          client = get().activeConnections.get(sessionId);
        }
      }

      if (!client) {
        throw new Error(`No active connection for session ${sessionId}`);
      }

      console.log(`[chatStore] Sending message to session ${sessionId}:`, content);

      // Add user message optimistically
      const userMessage: Message = {
        id: `${sessionId}-user-${Date.now()}`,
        content,
        sender: 'user',
        timestamp: new Date(),
        status: 'sending',
      };

      set((draft) => {
        const sessionMsgs = draft.sessionMessages.get(sessionId) || [];
        const newMessages = [...sessionMsgs, userMessage];
        const newSessionMessages = new Map(draft.sessionMessages);
        newSessionMessages.set(sessionId, newMessages);
        return { sessionMessages: newSessionMessages };
      });

      // Track which messages we've added (needs to be accessible in catch block)
      const addedMessageIds = new Set<string>();

      try {
        // Get context ID for this session (stored in sessionMessages metadata or session config)
        const sessionMessages = state.sessionMessages.get(sessionId) || [];
        let contextId: string | undefined;

        // Try to find contextId from previous messages
        for (const msg of sessionMessages) {
          if (msg.metadata?.contextId) {
            contextId = msg.metadata.contextId as string;
            break;
          }
        }

        // Create message request
        const messageRequest = {
          message: {
            role: 'user' as const,
            content: [
              {
                type: 'text' as const,
                content: content,
              },
            ],
          },
          context: contextId ? { contextId } : undefined,
        };

        // Update user message status to sent
        set((draft) => {
          const sessionMsgs = draft.sessionMessages.get(sessionId) || [];
          const msgIndex = sessionMsgs.findIndex((m) => m.id === userMessage.id);
          if (msgIndex >= 0) {
            const newMessages = [...sessionMsgs];
            newMessages[msgIndex] = { ...newMessages[msgIndex], status: 'sent' };
            const newSessionMessages = new Map(draft.sessionMessages);
            newSessionMessages.set(sessionId, newMessages);
            return { sessionMessages: newSessionMessages };
          }
          return {};
        });

        // Set typing indicator
        set((draft) => {
          const newTyping = new Map(draft.typingByContext);
          newTyping.set(sessionId, true);
          return { typingByContext: newTyping };
        });

        // Get stream timeout from config (for testing), default to no timeout for production
        const sessionConfig = state.sessionConfigs.get(sessionId);
        const streamTimeoutMs = sessionConfig?.streamTimeoutMs;
        const stream = client.message.stream(messageRequest);

        // Process stream with optional timeout
        const processStream = async () => {
          for await (const task of stream) {
            // Capture context ID from the server response
            if (!contextId) {
              const serverContextId = (task as any).contextId || task.metadata?.['contextId'];
              if (serverContextId) {
                contextId = serverContextId as string;

                // Check if this is a pending session that needs migration
                const isPendingSession = sessionId.startsWith('pending-');
                if (isPendingSession) {
                  console.log(
                    `[chatStore] Context ID received for pending session ${sessionId}: ${contextId}`
                  );
                  // Perform migration and wait for it to complete before continuing
                  // This prevents race conditions where messages are stored under the wrong ID
                  try {
                    await get().migratePendingSessionToRealId(sessionId, contextId);
                    // Update sessionId for the rest of the stream processing
                    sessionId = contextId;
                  } catch (error) {
                    console.error('[chatStore] Error migrating pending session:', error);
                    // Don't reassign sessionId if migration failed
                  }
                }

                // Store contextId in user message metadata for future reference
                set((draft) => {
                  const sessionMsgs = draft.sessionMessages.get(sessionId) || [];
                  const msgIndex = sessionMsgs.findIndex((m) => m.id === userMessage.id);
                  if (msgIndex >= 0) {
                    const newMessages = [...sessionMsgs];
                    newMessages[msgIndex] = {
                      ...newMessages[msgIndex],
                      metadata: { ...newMessages[msgIndex].metadata, contextId },
                    };
                    const newSessionMessages = new Map(draft.sessionMessages);
                    newSessionMessages.set(sessionId, newMessages);
                    return { sessionMessages: newSessionMessages };
                  }
                  return {};
                });
              }
            }

            // Process messages from the task
            if (task.messages && task.messages.length > 0) {
              for (let i = 0; i < task.messages.length; i++) {
                const message = task.messages[i];
                if (!message) continue;

                const contentParts = message.content || [];
                const textContent = contentParts
                  .filter((part: A2APart) => part.type === 'text')
                  .map((part: A2APart) => (part.type === 'text' ? part.content : ''))
                  .join('');

                if (textContent) {
                  const messageId = `${message.role}-${task.id}-${i}`;
                  const isStreaming = task.state === 'running' || task.state === 'pending';

                  set((draft) => {
                    const sessionMsgs = draft.sessionMessages.get(sessionId) || [];

                    // Skip if this is a user message that we already have
                    if (message.role === 'user') {
                      const isDuplicate = sessionMsgs.some(
                        (msg) => msg.sender === 'user' && msg.content === textContent
                      );
                      if (isDuplicate) {
                        return {};
                      }
                    }

                    const existingIndex = sessionMsgs.findIndex((msg) => msg.id === messageId);

                    const newMessages = [...sessionMsgs];
                    let updatedUnreadCounts: Map<string, number> | undefined;

                    if (existingIndex >= 0) {
                      // Update existing message
                      newMessages[existingIndex] = {
                        ...newMessages[existingIndex],
                        content: textContent,
                        metadata: {
                          ...newMessages[existingIndex].metadata,
                          isStreaming,
                          taskId: task.id,
                        },
                      };
                    } else {
                      // Add new message
                      const newMessage: Message = {
                        id: messageId,
                        content: textContent,
                        sender: message.role === 'user' ? 'user' : 'assistant',
                        timestamp: new Date(),
                        status: 'sent',
                        metadata: {
                          isStreaming,
                          taskId: task.id,
                          contextId,
                        },
                      };
                      newMessages.push(newMessage);

                      // Increment unread count for assistant messages if this session is not currently viewed
                      if (message.role === 'assistant' && draft.viewedSessionId !== sessionId) {
                        const newUnreadCounts = new Map(draft.unreadCounts);
                        const currentCount = newUnreadCounts.get(sessionId) || 0;
                        newUnreadCounts.set(sessionId, currentCount + 1);
                        updatedUnreadCounts = newUnreadCounts;
                      }
                    }

                    const newSessionMessages = new Map(draft.sessionMessages);
                    newSessionMessages.set(sessionId, newMessages);

                    // Return both updated values (don't mix mutation and return)
                    return updatedUnreadCounts
                      ? { sessionMessages: newSessionMessages, unreadCounts: updatedUnreadCounts }
                      : { sessionMessages: newSessionMessages };
                  });

                  addedMessageIds.add(messageId);
                }
              }
            }

            // Handle artifacts (files, images, etc.)
            if (task.artifacts && task.artifacts.length > 0) {
              for (const artifact of task.artifacts) {
                const artifactAny = artifact as any;
                if (artifactAny.parts && artifactAny.parts.length > 0) {
                  // Extract file parts (images, etc.)
                  // Extract text parts from artifacts (existing artifact handling for text files)
                  // Process text parts FIRST to match use-a2a.ts ordering
                  const textParts = artifactAny.parts.filter(
                    (p: any) => p.kind === 'text' && p.text
                  );

                  if (textParts.length > 0) {
                    const artifactId = artifactAny.artifactId || artifactAny.id;
                    const artifactMessageId = `artifact-text-${artifactId}`;

                    // Combine all text parts into a single message to avoid duplicate IDs
                    const combinedText = textParts.map((p: any) => p.text).join('\n\n');

                    set((draft) => {
                      const sessionMsgs = draft.sessionMessages.get(sessionId) || [];
                      const existingIndex = sessionMsgs.findIndex(
                        (msg) =>
                          msg.metadata?.artifactId === artifactId || msg.id === artifactMessageId
                      );

                      if (existingIndex < 0) {
                        const artifactMessage: Message = {
                          id: artifactMessageId,
                          content: `📄 ${artifactAny.name || artifactAny.artifactId || artifactAny.title}:\n\`\`\`${artifactAny.name?.split('.').pop() || ''}\n${combinedText}\n\`\`\``,
                          sender: 'assistant',
                          timestamp: new Date(),
                          status: 'sent',
                          metadata: {
                            taskId: task.id,
                            contextId,
                            isArtifact: true,
                            artifactName: artifactAny.name || artifactAny.artifactId,
                            rawContent: combinedText,
                            artifactId, // Store artifactId for duplicate detection
                          },
                        };

                        const newMessages = [...sessionMsgs, artifactMessage];
                        const newSessionMessages = new Map(draft.sessionMessages);
                        newSessionMessages.set(sessionId, newMessages);

                        return { sessionMessages: newSessionMessages };
                      }
                      return {};
                    });
                  }

                  // Handle file parts (images, etc.)
                  // Process file parts SECOND to match use-a2a.ts ordering
                  const fileParts = artifactAny.parts.filter(
                    (p: any) => p.kind === 'file' && p.bytes && p.mimeType
                  );

                  if (fileParts.length > 0) {
                    const files = fileParts.map((part: any) => ({
                      name: part.name || 'file',
                      mimeType: part.mimeType,
                      data: part.bytes, // base64 encoded
                    }));

                    const artifactId = artifactAny.artifactId || artifactAny.id;
                    const fileMessageId = `artifact-file-${artifactId}`;

                    set((draft) => {
                      const sessionMsgs = draft.sessionMessages.get(sessionId) || [];

                      // Check if this artifact has already been added (check by artifactId in metadata)
                      const existingIndex = sessionMsgs.findIndex(
                        (msg) => msg.metadata?.artifactId === artifactId || msg.id === fileMessageId
                      );

                      if (existingIndex < 0) {
                        const fileMessage: Message = {
                          id: fileMessageId,
                          content: ' ', // Space to ensure message renders
                          sender: 'assistant',
                          timestamp: new Date(),
                          status: 'sent',
                          files,
                          metadata: {
                            taskId: task.id,
                            contextId,
                            artifactId, // Store artifactId for duplicate detection
                          },
                        };

                        const newMessages = [...sessionMsgs, fileMessage];
                        const newSessionMessages = new Map(draft.sessionMessages);
                        newSessionMessages.set(sessionId, newMessages);

                        return { sessionMessages: newSessionMessages };
                      }
                      return {};
                    });
                  }
                }
              }
            }
          }
        };

        // Process stream with optional timeout
        try {
          if (streamTimeoutMs) {
            // Create timeout promise only when configured (for testing)
            const timeoutPromise = new Promise<never>((_, reject) => {
              setTimeout(() => {
                reject(new Error('Stream timeout: No response received'));
              }, streamTimeoutMs);
            });
            await Promise.race([processStream(), timeoutPromise]);
          } else {
            // No timeout for production - let server control timeout
            await processStream();
          }
        } finally {
          // Always clear typing indicator when stream ends (success, error, or timeout)
          set((draft) => {
            const newTyping = new Map(draft.typingByContext);
            newTyping.set(sessionId, false);
            return { typingByContext: newTyping };
          });
        }
      } catch (error) {
        console.error(`[chatStore] Error sending message to session ${sessionId}:`, error);
        console.log(`[chatStore] Error details:`, {
          name: error instanceof Error ? error.name : 'unknown',
          message: error instanceof Error ? error.message : String(error),
          receivedMessageCount: addedMessageIds.size,
        });

        // Note: typing indicator is cleared in finally block above

        // Detect if this is a navigation/connection abort
        const errorMessage =
          error instanceof Error ? error.message?.toLowerCase() : String(error).toLowerCase();
        const errorName = error instanceof Error ? error.name : '';
        const isAbortError =
          errorName === 'AbortError' ||
          errorMessage.includes('aborted') ||
          errorMessage.includes('user aborted') ||
          (errorMessage.includes('fetch') && errorMessage.includes('aborted')) ||
          // Network errors that occur when switching contexts
          errorMessage.includes('network') ||
          errorMessage.includes('failed to fetch');

        // Check if we received any assistant messages during the stream
        const receivedMessages = addedMessageIds.size > 0;

        // Also check if there are recent assistant messages in the session
        // (in case messages were added but not tracked in addedMessageIds)
        const sessionMessages = get().sessionMessages.get(sessionId) || [];
        const hasRecentAssistantMessage = sessionMessages.some(
          (msg) => msg.sender === 'assistant' && msg.timestamp.getTime() > Date.now() - 5000 // Within last 5 seconds
        );

        if (isAbortError && (receivedMessages || hasRecentAssistantMessage)) {
          console.log(
            `[chatStore] Stream aborted, but message was processed successfully (received: ${receivedMessages}, hasRecent: ${hasRecentAssistantMessage})`
          );
          // Don't mark as error - the message was sent and processed
          return;
        }

        // Only mark as error for genuine failures
        console.log(`[chatStore] Marking message as error (not an abort or no messages received)`);
        set((draft) => {
          const sessionMsgs = draft.sessionMessages.get(sessionId) || [];
          const msgIndex = sessionMsgs.findIndex((m) => m.id === userMessage.id);
          if (msgIndex >= 0) {
            const newMessages = [...sessionMsgs];
            newMessages[msgIndex] = {
              ...newMessages[msgIndex],
              status: 'error',
              error: error instanceof Error ? error : new Error(String(error)),
            };
            const newSessionMessages = new Map(draft.sessionMessages);
            newSessionMessages.set(sessionId, newMessages);
            return { sessionMessages: newSessionMessages };
          }
          return {};
        });

        // Don't throw - error is already logged and message is marked as error
        // Throwing can interfere with state updates and UI rendering
      }
    },

    getMessagesForSession: (sessionId: string): Message[] => {
      const state = get();
      return state.sessionMessages.get(sessionId) || [];
    },

    // Unread message actions
    markSessionAsRead: (sessionId: string) => {
      set((draft) => {
        const newUnreadCounts = new Map(draft.unreadCounts);
        newUnreadCounts.delete(sessionId);
        return { unreadCounts: newUnreadCounts, viewedSessionId: sessionId };
      });
    },

    incrementUnreadCount: (sessionId: string) => {
      set((draft) => {
        const newUnreadCounts = new Map(draft.unreadCounts);
        const currentCount = newUnreadCounts.get(sessionId) || 0;
        newUnreadCounts.set(sessionId, currentCount + 1);
        return { unreadCounts: newUnreadCounts };
      });
    },

    setViewedSession: (sessionId: string | null) => {
      set({ viewedSessionId: sessionId });
      // Automatically mark as read when viewed
      if (sessionId) {
        const state = get();
        const newUnreadCounts = new Map(state.unreadCounts);
        newUnreadCounts.delete(sessionId);
        set({ unreadCounts: newUnreadCounts });
      }
    },

    migratePendingSessionToRealId: async (pendingSessionId: string, realContextId: string) => {
      console.log(
        `[chatStore] Migrating pending session ${pendingSessionId} to real context ID ${realContextId}`
      );

      const state = get();

      // 1. Migrate active connection
      const client = state.activeConnections.get(pendingSessionId);
      if (client) {
        set((draft) => {
          const newConnections = new Map(draft.activeConnections);
          newConnections.delete(pendingSessionId);
          newConnections.set(realContextId, client);
          return { activeConnections: newConnections };
        });
      }

      // 2. Migrate session messages
      const messages = state.sessionMessages.get(pendingSessionId);
      if (messages) {
        set((draft) => {
          const newMessages = new Map(draft.sessionMessages);
          newMessages.delete(pendingSessionId);
          newMessages.set(realContextId, messages);
          return { sessionMessages: newMessages };
        });
      }

      // 3. Migrate session config
      const config = state.sessionConfigs.get(pendingSessionId);
      if (config) {
        set((draft) => {
          const newConfigs = new Map(draft.sessionConfigs);
          newConfigs.delete(pendingSessionId);
          newConfigs.set(realContextId, config);
          return { sessionConfigs: newConfigs };
        });
      }

      // 4. Migrate typing state
      const isTyping = state.typingByContext.get(pendingSessionId);
      if (isTyping !== undefined) {
        set((draft) => {
          const newTyping = new Map(draft.typingByContext);
          newTyping.delete(pendingSessionId);
          if (isTyping) {
            newTyping.set(realContextId, isTyping);
          }
          return { typingByContext: newTyping };
        });
      }

      // 5. Migrate auth required state
      const authRequired = state.authRequiredByContext.get(pendingSessionId);
      if (authRequired !== undefined) {
        set((draft) => {
          const newAuth = new Map(draft.authRequiredByContext);
          newAuth.delete(pendingSessionId);
          if (authRequired) {
            newAuth.set(realContextId, authRequired);
          }
          return { authRequiredByContext: newAuth };
        });
      }

      // 6. Migrate unread count
      const unreadCount = state.unreadCounts.get(pendingSessionId);
      if (unreadCount !== undefined) {
        set((draft) => {
          const newUnreadCounts = new Map(draft.unreadCounts);
          newUnreadCounts.delete(pendingSessionId);
          if (unreadCount > 0) {
            newUnreadCounts.set(realContextId, unreadCount);
          }
          return { unreadCounts: newUnreadCounts };
        });
      }

      // 7. Update viewed session if it was the pending session
      if (state.viewedSessionId === pendingSessionId) {
        set({ viewedSessionId: realContextId });
      }

      // 8. The server automatically creates the real session when the first message is sent
      // We trust that the session was created and don't need to immediately query the server
      // The UI will handle updating the session list, and normal polling will eventually sync it
      console.log(`[chatStore] Successfully migrated pending session to ${realContextId}`);

      // 9. Set migration tracking for UI updates AFTER all migration work is complete
      // This ensures any UI code reacting to lastMigration can safely perform operations
      // on the migrated session without race conditions
      set({
        lastMigration: { from: pendingSessionId, to: realContextId, suggestedName: realContextId },
      });
    },
  }))
);
