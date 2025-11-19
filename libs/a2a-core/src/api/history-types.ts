import { z } from 'zod';

/**
 * Server-side chat history type definitions and Zod schemas
 * Based on actual API testing against live A2A server
 * See: docs/api-testing-findings.md for detailed API behavior
 */

// ============================================================================
// Server Response Schemas (lowercase enums as discovered in live testing)
// ============================================================================

/**
 * Server message part - content within a message
 * Note: All 'kind' values are lowercase (not PascalCase as in docs)
 */
export const ServerMessagePartSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('text'),
    text: z.string(),
  }),
  z.object({
    kind: z.literal('data'),
    data: z.unknown(),
  }),
]);

/**
 * Server message - individual user/agent communication
 * Key findings:
 * - role is lowercase: "user" | "agent" (not "User" | "Agent")
 * - kind is lowercase: "message" (not "Message")
 * - Has metadata.timestamp for message-level timing
 * - taskId and contextId are optional (not present in taskStatus.message, only in history array)
 */
export const ServerMessageSchema = z.object({
  messageId: z.string(),
  taskId: z.string().optional(), // Optional - not present in taskStatus.message
  contextId: z.string().optional(), // Optional - not present in taskStatus.message
  role: z.enum(['user', 'agent']), // Lowercase as per actual API
  parts: z.array(ServerMessagePartSchema),
  metadata: z.object({
    timestamp: z.string(), // Format: "MM/DD/YYYY hh:mm:ss AM/PM"
  }),
  kind: z.literal('message'), // Lowercase
});

/**
 * Server task status - completion state of a task
 */
export const ServerTaskStatusSchema = z.object({
  state: z.string(), // e.g., "completed", "running" (lowercase)
  message: ServerMessageSchema,
  timestamp: z.string(),
});

/**
 * Server task - represents a message exchange (request + response)
 * Key findings:
 * - Has BOTH taskStatus and status (duplicates) - use taskStatus
 * - history array may be reverse chronological (newest first)
 * - kind is lowercase: "task" (not "Task")
 */
export const ServerTaskSchema = z.object({
  id: z.string(),
  contextId: z.string(),
  taskStatus: ServerTaskStatusSchema,
  status: ServerTaskStatusSchema, // Duplicate - prefer taskStatus
  history: z.array(ServerMessageSchema),
  kind: z.literal('task').optional(), // Lowercase - optional as not always returned
});

/**
 * Server context - represents a chat session/conversation
 * Key findings:
 * - name is OPTIONAL - only present if set via context/update
 * - isArchived defaults to false
 * - status field exists (e.g., "Running") but not well documented
 * - createdAt/updatedAt are US date format strings
 */
export const ServerContextSchema = z.object({
  id: z.string(),
  name: z.string().optional(), // Optional - set via context/update
  isArchived: z.boolean(),
  createdAt: z.string(), // Format: "MM/DD/YYYY hh:mm:ss AM/PM"
  updatedAt: z.string(),
  status: z.string(), // e.g., "Running"
  lastTask: ServerTaskSchema.optional(),
});

/**
 * Response from contexts/list API
 */
export const ListContextsResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.array(ServerContextSchema),
});

/**
 * Response from tasks/list API
 */
export const ListTasksResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: z.array(ServerTaskSchema),
});

/**
 * Response from context/update API
 */
export const UpdateContextResponseSchema = z.object({
  jsonrpc: z.literal('2.0'),
  id: z.string(),
  result: ServerContextSchema,
});

// ============================================================================
// Exported Types (inferred from schemas)
// ============================================================================

export type ServerMessagePart = z.infer<typeof ServerMessagePartSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
export type ServerTaskStatus = z.infer<typeof ServerTaskStatusSchema>;
export type ServerTask = z.infer<typeof ServerTaskSchema>;
export type ServerContext = z.infer<typeof ServerContextSchema>;
export type ListContextsResponse = z.infer<typeof ListContextsResponseSchema>;
export type ListTasksResponse = z.infer<typeof ListTasksResponseSchema>;
export type UpdateContextResponse = z.infer<typeof UpdateContextResponseSchema>;

// ============================================================================
// Request Parameter Types
// ============================================================================

export type ListContextsParams = {
  limit?: number; // Default: 20, max: 100
  before?: string; // Context ID for pagination
  after?: string; // Context ID for pagination
  includeLastTask?: boolean; // Include full last task with history
  includeArchived?: boolean; // Include archived contexts
};

export type ListTasksParams = {
  Id: string; // Context ID (note: capital 'I' as per API)
};

export type UpdateContextParams = {
  Id: string; // Context ID (note: capital 'I' as per API)
  Name?: string; // New name for the context
  IsArchived?: boolean; // Archive/unarchive the context
};

// ============================================================================
// Internal/UI Types (our application's format)
// ============================================================================

/**
 * Chat session - our internal representation of a context
 */
export type ChatSession = {
  id: string;
  name: string; // Fallback to id if server name is not set
  createdAt: Date;
  updatedAt: Date;
  status: string; // e.g., "Running", "Failed", "Completed" - indicates Logic App status
  lastMessage?: Message;
  messageCount?: number;
};

/**
 * Message - our internal representation
 * Note: We use 'assistant' instead of 'agent' for consistency with AI chat conventions
 */
export type Message = {
  id: string; // messageId
  role: 'user' | 'assistant'; // Map 'agent' -> 'assistant'
  content: MessageContent[];
  timestamp: Date; // Parsed from metadata.timestamp
  contextId: string;
  authEvent?: {
    authParts: Array<{
      serviceName: string;
      serviceIcon?: string;
      consentLink: string;
      description: string;
    }>;
    status: 'pending' | 'completed' | 'failed' | 'canceled';
  };
};

/**
 * Message content part - our internal representation
 */
export type MessageContent = { type: 'text'; text: string } | { type: 'data'; data: unknown };
