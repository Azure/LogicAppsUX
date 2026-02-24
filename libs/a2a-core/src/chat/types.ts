import type { Part } from '../types';

export type ChatRole = 'user' | 'assistant' | 'system';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  parts?: Part[];
  timestamp: Date;
  conversationId: string;
  metadata?: Record<string, unknown>;
};

export type ChatOptions = {
  conversationId?: string;
  persistMessages?: boolean;
  context?: Record<string, unknown>;
  streamingEnabled?: boolean;
  maxHistorySize?: number;
};

export type StreamUpdate = {
  content: string;
  isComplete: boolean;
  messageId: string;
};

export type ConversationExport = {
  conversationId: string;
  messages: ChatMessage[];
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  metadata?: Record<string, unknown>;
};

export type ChatEventMap = {
  message: ChatMessage;
  streamUpdate: StreamUpdate;
  error: Error;
  conversationStarted: { conversationId: string };
  conversationEnded: { conversationId: string };
};
