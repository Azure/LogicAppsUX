/**
 * Chat History Storage
 *
 * Provides storage abstraction for chat history with multiple backend implementations:
 * - Server storage: Uses A2A server history APIs
 * - Browser storage: Uses localStorage/IndexedDB (future implementation)
 *
 * @example
 * ```typescript
 * import { createHistoryStorage } from '@microsoft/logicAppsChat/storage';
 *
 * const storage = createHistoryStorage({
 *   type: 'server',
 *   agentUrl: 'https://example.com/api/agents/MyAgent',
 *   apiKey: 'your-api-key',
 *   oboUserToken: 'optional-obo-token',
 * });
 *
 * const sessions = await storage.listSessions();
 * const messages = await storage.listMessages(sessionId);
 * ```
 */

// Core interface
export type { ChatHistoryStorage, ListSessionsOptions, StorageConfig } from './history-storage';

// Server implementation
export { ServerHistoryStorage } from './server-history-storage';
export type { ServerHistoryStorageConfig } from './server-history-storage';

// Import for internal use
import { ServerHistoryStorage } from './server-history-storage';
import type { ChatHistoryStorage } from './history-storage';

/**
 * Factory function to create a history storage instance
 *
 * @param config - Storage configuration
 * @returns Storage instance implementing ChatHistoryStorage interface
 *
 * @example
 * ```typescript
 * // Server storage
 * const storage = createHistoryStorage({
 *   type: 'server',
 *   agentUrl: 'https://example.com/api/agents/MyAgent',
 *   apiKey: 'your-api-key',
 *   oboUserToken: 'optional-obo-token',
 * });
 *
 * // Browser storage (future)
 * const storage = createHistoryStorage({
 *   type: 'browser',
 *   storageKeyPrefix: 'my-app',
 * });
 * ```
 */
export const createHistoryStorage = (config: {
  type: 'server' | 'browser';
  agentUrl?: string;
  apiKey?: string;
  oboUserToken?: string;
  storageKeyPrefix?: string;
  timeout?: number;
}): ChatHistoryStorage => {
  if (config.type === 'server') {
    if (!config.agentUrl) {
      throw new Error('agentUrl is required for server storage');
    }

    return new ServerHistoryStorage({
      agentUrl: config.agentUrl,
      apiKey: config.apiKey,
      oboUserToken: config.oboUserToken,
      timeout: config.timeout,
    });
  }

  // Browser storage not yet implemented
  throw new Error('Browser storage not yet implemented. Use type: "server" for now.');
};

// Type exports from API module (re-export for convenience)
export type { ChatSession, Message, MessageContent } from '../api/history-types';
