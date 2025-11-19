/**
 * Types for chat history exchange between parent blade and iframe
 */

/**
 * Individual message in the chat history
 */
export interface ChatHistoryMessage {
  /** Unique identifier for the message */
  id: string;

  /** Role of the message sender */
  role: 'user' | 'assistant' | 'system';

  /** The actual content of the message */
  content: string;

  /** Timestamp when the message was created */
  timestamp: string | Date;

  /** Optional metadata associated with the message */
  metadata?: {
    /** Any artifacts (code, documents, etc.) included in the message */
    artifacts?: Array<{
      id: string;
      type: string;
      title?: string;
      content: string;
    }>;

    /** Custom metadata fields */
    [key: string]: any;
  };
}

/**
 * Chat history data structure sent via postMessage
 */
export interface ChatHistoryData {
  /** The context ID associated with this chat history */
  contextId: string;

  /** Array of messages in chronological order */
  messages: ChatHistoryMessage[];

  /** Optional metadata about the chat session */
  sessionMetadata?: {
    /** When the session started */
    startedAt?: string | Date;

    /** Last activity timestamp */
    lastActivityAt?: string | Date;

    /** Any custom session metadata */
    [key: string]: any;
  };
}

/**
 * Frame Blade message for sending chat history
 */
export interface ChatHistoryFrameBladeMessage {
  signature: 'FxFrameBlade';
  kind: 'chatHistory';
  data: ChatHistoryData;
  sessionId?: string;
}
