import { z } from 'zod';

// Agent Card related schemas
const AgentProviderSchema = z.object({
  organization: z.string(),
  url: z.string().url(),
});

const AgentCapabilitiesSchema = z.object({
  streaming: z.boolean().optional().default(false),
  pushNotifications: z.boolean().optional().default(false),
  stateTransitionHistory: z.boolean().optional().default(false),
  extensions: z
    .array(
      z.object({
        uri: z.string(),
        required: z.boolean().optional(),
        description: z.string().optional(),
        params: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .optional()
    .default([]),
});

const SecuritySchemeSchema = z.record(z.string(), z.unknown());

const AgentSkillSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  examples: z.array(z.string()).optional(),
  inputModes: z.array(z.string()).optional(),
  outputModes: z.array(z.string()).optional(),
});

const AgentInterfaceSchema = z.object({
  url: z.string().url(),
  transport: z.enum(['JSONRPC', 'GRPC', 'HTTP+JSON']),
});

export const AgentCardSchema = z.object({
  protocolVersion: z.string(),
  name: z.string().min(1),
  description: z.string(),
  url: z.string().url(),
  preferredTransport: z.enum(['JSONRPC', 'GRPC', 'HTTP+JSON']).optional(),
  additionalInterfaces: z.array(AgentInterfaceSchema).optional(),
  provider: AgentProviderSchema.optional(),
  iconUrl: z.string().url().optional(),
  version: z.string(),
  documentationUrl: z.string().url().optional(),
  capabilities: AgentCapabilitiesSchema,
  securitySchemes: z.record(z.string(), SecuritySchemeSchema).optional(),
  security: z.array(z.record(z.string(), z.array(z.string()))).optional(),
  defaultInputModes: z.array(z.string()),
  defaultOutputModes: z.array(z.string()),
  skills: z.array(AgentSkillSchema),
  supportsAuthenticatedExtendedCard: z.boolean().optional(),
});

export type AgentCard = z.infer<typeof AgentCardSchema>;
export type AgentProvider = z.infer<typeof AgentProviderSchema>;
export type AgentCapabilities = z.infer<typeof AgentCapabilitiesSchema>;
export type AgentSkill = z.infer<typeof AgentSkillSchema>;
export type AgentInterface = z.infer<typeof AgentInterfaceSchema>;

// Core A2A Protocol Types

// Part schema - content units within messages
export const PartSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('text'),
    content: z.string(),
  }),
  z.object({
    type: z.literal('file'),
    mimeType: z.string(),
    data: z.string(),
    filename: z.string().optional(),
  }),
  z.object({
    type: z.literal('structured'),
    schema: z.record(z.string(), z.unknown()),
    data: z.unknown(),
  }),
]);

// Message schema - communication turns
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.array(PartSchema),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Task states
export const TaskStateSchema = z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']);

// Artifact schema
const ArtifactSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Error schema
const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
});

// Task schema - stateful unit of work
export const TaskSchema = z.object({
  id: z.string(),
  state: TaskStateSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  messages: z.array(MessageSchema),
  artifacts: z.array(ArtifactSchema).optional(),
  error: ErrorSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type Part = z.infer<typeof PartSchema>;
export type Message = z.infer<typeof MessageSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TaskState = z.infer<typeof TaskStateSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;
export type TaskErrorData = z.infer<typeof ErrorSchema>;

// Request/Response Schemas

// Message send request
export const MessageSendRequestSchema = z.object({
  message: MessageSchema,
  context: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Message stream request
export const MessageStreamRequestSchema = z.object({
  message: MessageSchema,
  context: z.record(z.string(), z.unknown()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  streamOptions: z
    .object({
      includeUsage: z.boolean().optional(),
      includePartialArtifacts: z.boolean().optional(),
    })
    .optional(),
});

// Task get request
export const TaskGetRequestSchema = z.object({
  taskId: z.string(),
});

// Task cancel request
export const TaskCancelRequestSchema = z.object({
  taskId: z.string(),
  reason: z.string().optional(),
});

// Push subscribe request
export const PushSubscribeRequestSchema = z.object({
  endpoint: z.string().url(),
  events: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type MessageSendRequest = z.infer<typeof MessageSendRequestSchema>;
export type MessageStreamRequest = z.infer<typeof MessageStreamRequestSchema>;
export type TaskGetRequest = z.infer<typeof TaskGetRequestSchema>;
export type TaskCancelRequest = z.infer<typeof TaskCancelRequestSchema>;
export type PushSubscribeRequest = z.infer<typeof PushSubscribeRequestSchema>;

// JSON-RPC 2.0 Protocol Schemas

// JSON-RPC Error object schema
export const JsonRpcErrorObjectSchema = z.object({
  code: z.number(),
  message: z.string(),
  data: z.unknown().optional(),
});

// JSON-RPC Error response schema
export const JsonRpcErrorSchema = z.object({
  jsonrpc: z.literal('2.0'),
  error: JsonRpcErrorObjectSchema,
  id: z.union([z.string(), z.number(), z.null()]),
});

// JSON-RPC Result response schema (generic, parametrized by result type)
export const createJsonRpcResultSchema = <T extends z.ZodTypeAny>(resultSchema: T) =>
  z.object({
    jsonrpc: z.literal('2.0'),
    result: resultSchema,
    id: z.union([z.string(), z.number(), z.null()]),
  });

// JSON-RPC Response schema (can be either success or error)
export const createJsonRpcResponseSchema = <T extends z.ZodTypeAny>(resultSchema: T) =>
  z.union([createJsonRpcResultSchema(resultSchema), JsonRpcErrorSchema]);

// Type exports
export type JsonRpcErrorObject = z.infer<typeof JsonRpcErrorObjectSchema>;
export type JsonRpcError = z.infer<typeof JsonRpcErrorSchema>;
export type JsonRpcResult<T> = {
  jsonrpc: '2.0';
  result: T;
  id: string | number | null;
};
export type JsonRpcResponse<T> = JsonRpcResult<T> | JsonRpcError;

// Helper type guard to check if response is an error
export function isJsonRpcError(response: unknown): response is JsonRpcError {
  try {
    JsonRpcErrorSchema.parse(response);
    return true;
  } catch {
    return false;
  }
}

// Helper type guard to check if response has result
export function isJsonRpcResult<T>(response: unknown): response is JsonRpcResult<T> {
  if (
    typeof response === 'object' &&
    response !== null &&
    'jsonrpc' in response &&
    response.jsonrpc === '2.0' &&
    'result' in response
  ) {
    return true;
  }
  return false;
}
