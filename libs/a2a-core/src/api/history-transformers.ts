/**
 * Data transformation utilities for A2A Chat History
 *
 * Transforms between server response format and internal application format.
 *
 * Key transformations:
 * - Server format uses lowercase enums ("user", "agent", "text")
 * - Internal format uses "assistant" instead of "agent"
 * - Server dates are US format strings ("MM/DD/YYYY hh:mm:ss AM/PM")
 * - Internal format uses Date objects
 * - Server contexts may not have names (use id as fallback)
 * - Server history arrays may be reverse chronological
 *
 * See: docs/api-testing-findings.md for detailed behavior
 */

import type {
  ServerContext,
  ServerTask,
  ServerMessage,
  ServerMessagePart,
  ChatSession,
  Message,
  MessageContent,
} from './history-types';

/**
 * Transform a server context to our internal ChatSession format
 *
 * @param serverContext - Context from server API
 * @returns Internal ChatSession representation
 */
export const transformContext = (serverContext: ServerContext): ChatSession => {
  return {
    id: serverContext.id,
    // Use name if present, otherwise fallback to id
    name: serverContext.name ?? serverContext.id,
    createdAt: parseServerDate(serverContext.createdAt),
    updatedAt: parseServerDate(serverContext.updatedAt),
    status: serverContext.status, // Logic App status (Running, Failed, etc.)
    lastMessage: serverContext.lastTask ? extractLastMessage(serverContext.lastTask) : undefined,
    messageCount: serverContext.lastTask ? serverContext.lastTask.history.length : undefined,
  };
};

/**
 * Transform server tasks to internal Message array
 *
 * Flattens all task histories into a single chronological message list.
 * Handles potential reverse chronological ordering from server.
 *
 * @param serverTasks - Array of tasks from server
 * @returns Array of messages in chronological order
 */
export const transformTasksToMessages = (serverTasks: ServerTask[]): Message[] => {
  const messages: Message[] = [];

  // Flatten all task histories
  for (const task of serverTasks) {
    const taskState = task.taskStatus?.state;
    for (const serverMessage of task.history) {
      messages.push(transformMessage(serverMessage, taskState));
    }
  }

  // Sort by timestamp to ensure chronological order
  // This handles cases where history arrays might be reverse chronological
  // When timestamps are equal, ensure user messages come before assistant messages
  messages.sort((a, b) => {
    const timeDiff = a.timestamp.getTime() - b.timestamp.getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    // Same timestamp: user messages (role='user') should come before assistant messages
    // user=0, assistant=1, so 'user' sorts before 'assistant'
    return a.role === 'user' ? -1 : b.role === 'user' ? 1 : 0;
  });

  return messages;
};

/**
 * Transform a server message to internal Message format
 *
 * @param serverMessage - Message from server
 * @param taskState - Optional task state to detect auth-required messages
 * @returns Internal Message representation
 */
export const transformMessage = (serverMessage: ServerMessage, taskState?: string): Message => {
  const message: Message = {
    id: serverMessage.messageId,
    // Transform 'agent' -> 'assistant' for consistency with AI chat conventions
    role: serverMessage.role === 'agent' ? 'assistant' : 'user',
    content: transformMessageParts(serverMessage.parts),
    timestamp: parseServerDate(serverMessage.metadata.timestamp),
    contextId: serverMessage.contextId || '',
  };

  // Detect auth-required messages from history
  // These come from the server with text like: "Please authenticate using links: [{...}]."
  // For historical messages, we show them as simple informational text since the auth already happened
  // Only show interactive auth UI for live messages with taskState === 'auth-required'
  if (isAuthRequiredMessage(serverMessage)) {
    if (taskState === 'auth-required') {
      // Live auth-required message - show interactive UI
      const authEvent = extractAuthEventFromMessage(serverMessage);
      if (authEvent) {
        message.authEvent = authEvent;
        // Override content to show a user-friendly message
        message.content = [
          {
            type: 'text',
            text: 'Authentication required',
          },
        ];
      }
    } else {
      // Historical auth message from server history - show as simple informational message with service names
      const authEvent = extractAuthEventFromMessage(serverMessage);
      if (authEvent && authEvent.authParts && authEvent.authParts.length > 0) {
        const serviceNames = authEvent.authParts.map((part: any) => part.serviceName).join(', ');
        message.content = [
          {
            type: 'text',
            text: `Authentication was required for ${serviceNames}`,
          },
        ];
      } else {
        message.content = [
          {
            type: 'text',
            text: 'Authentication was required for this request',
          },
        ];
      }
    }
  }

  return message;
};

/**
 * Transform server message parts to internal content format
 *
 * @param parts - Server message parts
 * @returns Internal message content array
 */
export const transformMessageParts = (parts: ServerMessagePart[]): MessageContent[] => {
  return parts.map((part) => {
    if (part.kind === 'text') {
      return {
        type: 'text',
        text: part.text,
      };
    } else {
      return {
        type: 'data',
        data: part.data,
      };
    }
  });
};

/**
 * Extract the last message from a task
 *
 * The last message is typically the most recent one in the history array.
 * Since history may be reverse chronological, we take the first element.
 *
 * @param task - Server task
 * @returns Last message or undefined
 */
const extractLastMessage = (task: ServerTask): Message | undefined => {
  if (task.history.length === 0) {
    return undefined;
  }

  // History may be reverse chronological (newest first)
  // So we check the first element first, then fallback to last
  const lastServerMessage = task.history[0];

  return transformMessage(lastServerMessage);
};

/**
 * Parse a server date string to Date object
 *
 * Server uses US date format: "MM/DD/YYYY hh:mm:ss AM/PM"
 *
 * @param dateStr - Date string from server
 * @returns Date object
 */
const parseServerDate = (dateStr: string): Date => {
  // JavaScript Date constructor handles this format natively
  const date = new Date(dateStr);

  // Validate the date
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }

  return date;
};

/**
 * Transform internal message to server format (for sending)
 *
 * This is used when we need to send messages back to the server
 * in the correct format (though typically chat messages go through
 * the regular A2A protocol, not the history API)
 *
 * @param message - Internal message
 * @returns Server message format
 */
export const transformMessageToServer = (
  message: Message
): Omit<ServerMessage, 'taskId' | 'contextId' | 'kind' | 'metadata'> => {
  return {
    messageId: message.id,
    // Transform 'assistant' back to 'agent'
    role: message.role === 'assistant' ? 'agent' : 'user',
    parts: message.content.map((content) => {
      if (content.type === 'text') {
        return {
          kind: 'text' as const,
          text: content.text,
        };
      } else {
        return {
          kind: 'data' as const,
          data: content.data,
        };
      }
    }),
  };
};

/**
 * Detect if a message is an auth-required message
 *
 * Auth messages from history have text like: "Please authenticate using links: [{...}]."
 */
const isAuthRequiredMessage = (serverMessage: ServerMessage): boolean => {
  // Check if message has text parts that start with "Please authenticate using links:"
  return serverMessage.parts.some(
    (part) => part.kind === 'text' && part.text.startsWith('Please authenticate using links:')
  );
};

/**
 * Extract auth event from a server message
 *
 * Parses the JSON array from the text part containing authentication details
 */
const extractAuthEventFromMessage = (serverMessage: ServerMessage): any | null => {
  try {
    // Find the text part with auth details
    const authPart = serverMessage.parts.find(
      (part) => part.kind === 'text' && part.text.startsWith('Please authenticate using links:')
    );

    if (!authPart || authPart.kind !== 'text') {
      return null;
    }

    // Extract the JSON array from the text
    // Format: "Please authenticate using links: [{...}]."
    const jsonMatch = authPart.text.match(/Please authenticate using links:\s*(\[[\s\S]*\])\./);
    if (!jsonMatch || !jsonMatch[1]) {
      return null;
    }

    const authDetails = JSON.parse(jsonMatch[1]);

    // Transform to the format expected by the UI
    // Server format: { ApiDetails: {...}, Link: "...", Status: "..." }
    // UI format: { serviceName, serviceIcon, consentLink, description }
    const authParts = authDetails.map((detail: any) => ({
      serviceName: detail.ApiDetails?.ApiDisplayName || 'External Service',
      serviceIcon: detail.ApiDetails?.ApiIconUri,
      consentLink: detail.Link,
      description: 'Authentication required for this service',
    }));

    return {
      authParts,
      status: 'pending' as const,
    };
  } catch (error) {
    console.error('[history-transformers] Failed to parse auth message:', error);
    return null;
  }
};
