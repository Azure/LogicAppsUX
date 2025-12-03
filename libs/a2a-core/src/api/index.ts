/**
 * A2A Chat History API
 *
 * Server-side chat history management for A2A protocol agents.
 *
 * This module provides:
 * - Type-safe API client for history operations
 * - Data transformation between server and internal formats
 * - Zod schemas for runtime validation
 *
 * @example
 * ```typescript
 * import { createHistoryApi, transformContext } from '@microsoft/logicAppsChat/api';
 *
 * const historyApi = createHistoryApi({
 *   agentUrl: 'https://example.com/api/agents/MyAgent',
 *   getAuthToken: () => getToken(),
 * });
 *
 * const contexts = await historyApi.listContexts({
 *   includeLastTask: true,
 *   includeArchived: false,
 * });
 *
 * const sessions = contexts.map(transformContext);
 * ```
 */

// API Client
export { createHistoryApi, type HistoryApi, type HistoryApiConfig } from './history-api';

// Transformers
export {
  transformContext,
  transformTasksToMessages,
  transformMessage,
  transformMessageParts,
  transformMessageToServer,
} from './history-transformers';

// Types
export type {
  // Server types
  ServerContext,
  ServerTask,
  ServerTaskStatus,
  ServerMessage,
  ServerMessagePart,
  ListContextsResponse,
  ListTasksResponse,
  UpdateContextResponse,
  // Request parameter types
  ListContextsParams,
  ListTasksParams,
  UpdateContextParams,
  // Internal types
  ChatSession,
  Message,
  MessageContent,
} from './history-types';

// Schemas (for runtime validation)
export {
  ServerContextSchema,
  ServerTaskSchema,
  ServerTaskStatusSchema,
  ServerMessageSchema,
  ServerMessagePartSchema,
  ListContextsResponseSchema,
  ListTasksResponseSchema,
  UpdateContextResponseSchema,
} from './history-types';
