/**
 * Mock SSE response fixtures for A2A Chat testing
 *
 * These fixtures provide reusable SSE event sequences for different scenarios.
 */

import type { Part, Message, Task } from '@microsoft/a2achat-core';

/**
 * SSE Event structure
 */
export type SSEEvent = {
  event?: string;
  data: string;
  id?: string;
  retry?: number;
};

/**
 * Create a text part
 */
export const createTextPart = (content: string): Part => ({
  type: 'text',
  content,
});

/**
 * Create a structured data part
 */
export const createStructuredPart = (data: unknown, schema?: Record<string, unknown>): Part => ({
  type: 'structured',
  data,
  schema: schema ?? {},
});

/**
 * Create a user message
 */
export const createUserMessage = (
  content: string,
  metadata?: Record<string, unknown>
): Message => ({
  role: 'user',
  content: [createTextPart(content)],
  metadata,
});

/**
 * Create an assistant message
 */
export const createAssistantMessage = (
  content: string,
  metadata?: Record<string, unknown>
): Message => ({
  role: 'assistant',
  content: [createTextPart(content)],
  metadata,
});

/**
 * Create a JSON-RPC 2.0 success response
 */
export const createJsonRpcSuccess = (result: unknown, id: string | number = 1) => ({
  jsonrpc: '2.0',
  id,
  result,
});

/**
 * Create a JSON-RPC 2.0 error response
 */
export const createJsonRpcError = (
  code: number,
  message: string,
  data?: unknown,
  id: string | number = 1
) => ({
  jsonrpc: '2.0',
  id,
  error: {
    code,
    message,
    data,
  },
});

/**
 * Create an SSE event
 */
export const createSSEEvent = (data: unknown, event?: string, id?: string): SSEEvent => {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return {
    event,
    data: dataString,
    id,
  };
};

/**
 * Format SSE event as wire format
 */
export const formatSSEEvent = (event: SSEEvent): string => {
  let formatted = '';
  if (event.event) {
    formatted += `event: ${event.event}\n`;
  }
  if (event.id) {
    formatted += `id: ${event.id}\n`;
  }
  if (event.retry !== undefined) {
    formatted += `retry: ${event.retry}\n`;
  }
  formatted += `data: ${event.data}\n\n`;
  return formatted;
};

/**
 * Happy path: Simple text response
 */
export const createSimpleTextResponse = (text: string, taskId = 'task-1'): SSEEvent[] => {
  const task: Task = {
    id: taskId,
    state: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [createAssistantMessage(text)],
  };

  return [
    createSSEEvent(createJsonRpcSuccess(task, 1), 'message'),
    createSSEEvent('[DONE]', 'done'),
  ];
};

/**
 * Streaming response: Text chunks
 */
export const createStreamingTextResponse = (
  text: string,
  chunkSize = 10,
  taskId = 'task-1'
): SSEEvent[] => {
  const events: SSEEvent[] = [];
  const chunks = text.match(new RegExp(`.{1,${chunkSize}}`, 'g')) || [text];

  // Send initial task with streaming state
  const initialTask: Task = {
    id: taskId,
    state: 'running',
    createdAt: new Date().toISOString(),
    messages: [createAssistantMessage('')],
  };

  events.push(createSSEEvent(createJsonRpcSuccess(initialTask, 1), 'message'));

  // Send chunks
  let accumulatedContent = '';
  chunks.forEach((chunk, index) => {
    accumulatedContent += chunk;
    const chunkTask: Task = {
      id: taskId,
      state: 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [createAssistantMessage(accumulatedContent)],
    };
    events.push(createSSEEvent(createJsonRpcSuccess(chunkTask, 1), 'message', `chunk-${index}`));
  });

  // Send final complete task
  const finalTask: Task = {
    id: taskId,
    state: 'completed',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messages: [createAssistantMessage(text)],
  };
  events.push(createSSEEvent(createJsonRpcSuccess(finalTask, 1), 'message'));
  events.push(createSSEEvent('[DONE]', 'done'));

  return events;
};

/**
 * Auth required response
 */
export const createAuthRequiredResponse = (consentUrl: string, taskId = 'task-1'): SSEEvent[] => {
  const authEvent = {
    taskId,
    contextId: 'context-1',
    messageType: 'auth-required',
    authParts: [
      {
        consentLink: consentUrl,
        status: 'pending',
        serviceName: 'Test Service',
        description: 'Authentication required to continue',
      },
    ],
  };

  return [createSSEEvent(createJsonRpcSuccess(authEvent, 1), 'auth-required')];
};

/**
 * Error response: Network error
 */
export const createNetworkErrorResponse = (): SSEEvent[] => {
  return [
    createSSEEvent(
      createJsonRpcError(-32000, 'Network error', { type: 'network', retryable: true }, 1),
      'error'
    ),
  ];
};

/**
 * Error response: Server error
 */
export const createServerErrorResponse = (
  statusCode = 500,
  message = 'Internal server error'
): SSEEvent[] => {
  return [
    createSSEEvent(
      createJsonRpcError(-32603, message, { statusCode, retryable: true }, 1),
      'error'
    ),
  ];
};

/**
 * Error response: Validation error
 */
export const createValidationErrorResponse = (message = 'Invalid input'): SSEEvent[] => {
  return [createSSEEvent(createJsonRpcError(-32602, message, { retryable: false }, 1), 'error')];
};

/**
 * Malformed response: Invalid JSON
 */
export const createMalformedResponse = (): SSEEvent[] => {
  return [
    {
      event: 'message',
      data: '{invalid json',
    },
  ];
};

/**
 * Timeout response: No data sent
 */
export const createTimeoutResponse = (): SSEEvent[] => {
  return []; // No events = timeout
};

/**
 * Partial response: Connection drops mid-stream
 */
export const createPartialResponse = (text: string, taskId = 'task-1'): SSEEvent[] => {
  const events = createStreamingTextResponse(text, 10, taskId);
  // Remove the last "done" event to simulate connection drop
  return events.slice(0, Math.floor(events.length / 2));
};

/**
 * Multi-message response: Multiple assistant messages
 */
export const createMultiMessageResponse = (messages: string[], taskId = 'task-1'): SSEEvent[] => {
  const events: SSEEvent[] = [];

  messages.forEach((msg, index) => {
    const task: Task = {
      id: taskId,
      state: index === messages.length - 1 ? 'completed' : 'running',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [createAssistantMessage(msg)],
    };
    events.push(createSSEEvent(createJsonRpcSuccess(task, index + 1), 'message'));
  });

  events.push(createSSEEvent('[DONE]', 'done'));
  return events;
};

/**
 * Rate limit error response
 */
export const createRateLimitErrorResponse = (retryAfter = 60): SSEEvent[] => {
  return [
    createSSEEvent(
      createJsonRpcError(-32001, 'Rate limit exceeded', { retryable: true, retryAfter }, 1),
      'error'
    ),
  ];
};

/**
 * Empty response
 */
export const createEmptyResponse = (): SSEEvent[] => {
  return [createSSEEvent('[DONE]', 'done')];
};
