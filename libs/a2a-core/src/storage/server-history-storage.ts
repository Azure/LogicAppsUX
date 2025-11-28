/**
 * Server-based Chat History Storage
 *
 * Implements ChatHistoryStorage interface using A2A server APIs.
 * All chat history is stored on the server, enabling:
 * - Cross-device access
 * - Session persistence across browser refreshes
 * - Centralized history management
 *
 * Note: This implementation uses the history APIs we tested against live servers.
 * See: docs/api-testing-findings.md for API behavior details.
 */

import { createHistoryApi, type HistoryApi } from '../api/history-api';
import { transformContext, transformTasksToMessages } from '../api/history-transformers';
import type { ChatSession, Message } from '../api/history-types';
import type { ChatHistoryStorage, ListSessionsOptions } from './history-storage';

/**
 * Configuration for server history storage
 */
export type ServerHistoryStorageConfig = {
  agentUrl: string;
  apiKey?: string; // API key for authentication (passed as X-API-Key header)
  oboUserToken?: string; // OBO user token for authentication (passed as x-ms-obo-userToken header)
  timeout?: number;
};

/**
 * Server-based history storage implementation
 *
 * Uses A2A server history APIs for all operations.
 */
export class ServerHistoryStorage implements ChatHistoryStorage {
  private api: HistoryApi;
  private cache: Map<string, ChatSession>;
  private messageCache: Map<string, Message[]>;

  constructor(config: ServerHistoryStorageConfig) {
    console.log('[ServerHistoryStorage] Creating instance with config:', {
      agentUrl: config.agentUrl,
      hasApiKey: !!config.apiKey,
      hasOboUserToken: !!config.oboUserToken,
      timeout: config.timeout,
    });

    this.api = createHistoryApi({
      agentUrl: config.agentUrl,
      apiKey: config.apiKey,
      oboUserToken: config.oboUserToken,
      timeout: config.timeout,
    });

    // Simple in-memory cache to reduce API calls
    this.cache = new Map();
    this.messageCache = new Map();

    console.log('[ServerHistoryStorage] Instance created successfully');
  }

  /**
   * List all chat sessions
   *
   * Uses contexts/list API with includeLastTask for efficiency.
   */
  async listSessions(options?: ListSessionsOptions): Promise<ChatSession[]> {
    const limit = options?.limit ?? 20;
    const includeArchived = options?.includeArchived ?? false;

    console.log('[ServerHistoryStorage] listSessions called with options:', {
      limit,
      includeArchived,
    });

    const serverContexts = await this.api.listContexts({
      limit,
      includeArchived,
      includeLastTask: true, // Get last message for preview
    });

    console.log('[ServerHistoryStorage] Received', serverContexts.length, 'contexts from API');

    const sessions = serverContexts.map(transformContext);

    // Update cache
    for (const session of sessions) {
      this.cache.set(session.id, session);
    }

    // Sort by updatedAt descending (most recent first)
    sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    console.log('[ServerHistoryStorage] Returning', sessions.length, 'sessions');
    return sessions;
  }

  /**
   * Create a new chat session
   *
   * Note: The server auto-creates contexts on first message, so we return
   * a pending session. The actual context ID will be assigned when the first
   * message is sent through the regular chat flow.
   */
  async createSession(name?: string): Promise<ChatSession> {
    // Server doesn't have a contexts/create endpoint that works standalone
    // Contexts are created automatically when first message is sent
    // So we create a "pending" session locally
    const pendingSession: ChatSession = {
      id: `pending-${Date.now()}`, // Temporary ID until first message
      name: name ?? `New Chat`,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'Running', // Pending sessions are available for use
    };

    this.cache.set(pendingSession.id, pendingSession);

    return pendingSession;
  }

  /**
   * Get a specific session by ID
   *
   * First checks cache, then fetches from server if not found.
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    // Check cache first
    if (this.cache.has(sessionId)) {
      return this.cache.get(sessionId)!;
    }

    // Fetch from server
    // We have to list all contexts and find the one we want
    // (There's no context/get endpoint)
    const sessions = await this.listSessions({ limit: 100 });
    return sessions.find((s) => s.id === sessionId) ?? null;
  }

  /**
   * Update a session (rename, etc.)
   *
   * Uses context/update API (singular method name!)
   */
  async updateSession(
    sessionId: string,
    updates: Partial<Pick<ChatSession, 'name'>>
  ): Promise<ChatSession> {
    const updateParams: { Id: string; Name?: string } = {
      Id: sessionId,
    };

    if (updates.name !== undefined) {
      updateParams.Name = updates.name;
    }

    const updatedContext = await this.api.updateContext(updateParams);
    const updatedSession = transformContext(updatedContext);

    // Update cache
    this.cache.set(sessionId, updatedSession);

    return updatedSession;
  }

  /**
   * Delete (archive) a session
   *
   * Uses context/update with IsArchived: true
   */
  async deleteSession(sessionId: string): Promise<void> {
    await this.api.updateContext({
      Id: sessionId,
      IsArchived: true,
    });

    // Remove from cache
    this.cache.delete(sessionId);
    this.messageCache.delete(sessionId);
  }

  /**
   * List all messages in a session
   *
   * Uses tasks/list API and transforms to our message format.
   */
  async listMessages(sessionId: string): Promise<Message[]> {
    // Check cache first
    if (this.messageCache.has(sessionId)) {
      return this.messageCache.get(sessionId)!;
    }

    // Fetch from server
    const tasks = await this.api.listTasks(sessionId);
    const messages = transformTasksToMessages(tasks);

    // Cache the messages
    this.messageCache.set(sessionId, messages);

    return messages;
  }

  /**
   * Add a message to a session
   *
   * For server storage, messages are added through the normal chat flow
   * (tasks/invoke), not through the history API. This method performs an
   * optimistic cache update only.
   *
   * The actual message will be persisted when sent through A2A protocol.
   */
  async addMessage(sessionId: string, message: Message): Promise<void> {
    // Optimistic cache update
    if (this.messageCache.has(sessionId)) {
      const messages = this.messageCache.get(sessionId)!;
      messages.push(message);
      // Keep sorted chronologically
      messages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    }

    // Update session's lastMessage in cache
    if (this.cache.has(sessionId)) {
      const session = this.cache.get(sessionId)!;
      session.lastMessage = message;
      session.updatedAt = new Date();
    }

    // Note: The actual message persistence happens through the A2A protocol
    // when the message is sent via tasks/invoke or message/stream
  }

  /**
   * Clear all chat history
   *
   * Archives all contexts on the server.
   */
  async clear(): Promise<void> {
    // Get all non-archived contexts
    const sessions = await this.listSessions({ includeArchived: false });

    // Archive each one
    await Promise.all(
      sessions.map((session) =>
        this.api.updateContext({
          Id: session.id,
          IsArchived: true,
        })
      )
    );

    // Clear caches
    this.cache.clear();
    this.messageCache.clear();
  }

  /**
   * Invalidate cache for a session
   *
   * Useful after operations that modify server state.
   */
  invalidateCache(sessionId?: string): void {
    if (sessionId) {
      this.cache.delete(sessionId);
      this.messageCache.delete(sessionId);
    } else {
      this.cache.clear();
      this.messageCache.clear();
    }
  }

  /**
   * Invalidate all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.messageCache.clear();
  }
}
