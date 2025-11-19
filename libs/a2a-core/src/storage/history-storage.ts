/**
 * Chat History Storage Interface
 *
 * Provides an abstraction over different storage backends for chat history.
 * Implementations can be server-based or browser-based (localStorage, IndexedDB).
 *
 * This interface follows the repository pattern, providing methods for:
 * - Managing chat sessions (contexts)
 * - Managing messages within sessions
 * - CRUD operations with async support
 */

import type { ChatSession, Message } from '../api/history-types';

/**
 * Chat history storage interface
 *
 * All methods are async to support both local and remote storage backends.
 */
export interface ChatHistoryStorage {
  // ============================================================================
  // Chat Session Management
  // ============================================================================

  /**
   * List all chat sessions (contexts)
   *
   * @param options - Optional filter options
   * @returns Array of chat sessions, sorted by updatedAt descending
   */
  listSessions(options?: ListSessionsOptions): Promise<ChatSession[]>;

  /**
   * Create a new chat session
   *
   * @param name - Optional name for the session
   * @returns Newly created session
   *
   * Note: For server storage, the actual context may be created on first message.
   * This might return a "pending" session that gets a real ID after first message.
   */
  createSession(name?: string): Promise<ChatSession>;

  /**
   * Get a specific chat session by ID
   *
   * @param sessionId - The session/context ID
   * @returns The session, or null if not found
   */
  getSession(sessionId: string): Promise<ChatSession | null>;

  /**
   * Update a chat session (rename, etc.)
   *
   * @param sessionId - The session ID to update
   * @param updates - Partial updates to apply
   * @returns Updated session
   */
  updateSession(
    sessionId: string,
    updates: Partial<Pick<ChatSession, 'name'>>
  ): Promise<ChatSession>;

  /**
   * Delete (archive) a chat session
   *
   * For server storage, this archives the context (isArchived: true).
   * For local storage, this removes it from storage.
   *
   * @param sessionId - The session ID to delete
   */
  deleteSession(sessionId: string): Promise<void>;

  // ============================================================================
  // Message Management
  // ============================================================================

  /**
   * List all messages in a session
   *
   * @param sessionId - The session ID
   * @returns Array of messages, sorted chronologically
   */
  listMessages(sessionId: string): Promise<Message[]>;

  /**
   * Add a message to a session
   *
   * Note: For server storage, messages are typically added through the normal
   * chat flow (tasks/invoke), so this might be a no-op or optimistic update.
   *
   * @param sessionId - The session ID
   * @param message - The message to add
   */
  addMessage(sessionId: string, message: Message): Promise<void>;

  // ============================================================================
  // Utility
  // ============================================================================

  /**
   * Clear all chat history
   *
   * For server storage, this archives all contexts.
   * For local storage, this clears the storage.
   */
  clear(): Promise<void>;
}

/**
 * Options for listing sessions
 */
export type ListSessionsOptions = {
  /**
   * Maximum number of sessions to return
   * Default: 20
   */
  limit?: number;

  /**
   * Include archived/deleted sessions
   * Default: false
   */
  includeArchived?: boolean;
};

/**
 * Configuration for storage implementations
 */
export type StorageConfig = {
  /**
   * Storage type
   */
  type: 'server' | 'browser';

  /**
   * For server storage: agent URL
   */
  agentUrl?: string;

  /**
   * For server storage: API key for authentication
   */
  apiKey?: string;

  /**
   * For server storage: OBO user token for authentication
   */
  oboUserToken?: string;

  /**
   * For browser storage: storage key prefix
   */
  storageKeyPrefix?: string;
};
