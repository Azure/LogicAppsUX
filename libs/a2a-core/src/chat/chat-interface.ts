import { EventEmitter } from 'eventemitter3';
import type { A2AClient } from '../client/a2a-client';
import type { SessionManager } from '../session/session-manager';
import type { Message, Part } from '../types';
import type {
  ChatMessage,
  ChatOptions,
  ChatEventMap,
  StreamUpdate,
  ConversationExport,
} from './types';

export interface ChatInterfaceConfig {
  client: A2AClient;
  session?: SessionManager;
  conversationId?: string;
  persistMessages?: boolean;
  context?: Record<string, unknown>;
  streamingEnabled?: boolean;
  maxHistorySize?: number;
}

export class ChatInterface extends EventEmitter<ChatEventMap> {
  private client: A2AClient;
  private session: SessionManager | undefined;
  private conversationId: string;
  private messages: ChatMessage[] = [];
  private options: Required<ChatOptions>;
  private context: Record<string, unknown>;

  constructor(config: ChatInterfaceConfig) {
    super();

    this.client = config.client;
    this.session = config.session;
    this.context = config.context || {};

    // Set up options with defaults
    this.options = {
      conversationId: config.conversationId || this.generateConversationId(),
      persistMessages: config.persistMessages ?? !!config.session,
      context: this.context,
      streamingEnabled: config.streamingEnabled ?? true,
      maxHistorySize: config.maxHistorySize ?? 100,
    };

    // Load or set conversation ID
    if (this.session) {
      const existingId = this.session.get('a2a-conversation-id') as string;
      this.conversationId = existingId || this.options.conversationId;

      if (!existingId) {
        this.session.set('a2a-conversation-id', this.conversationId);
      }

      // Load conversation history
      this.loadConversationHistory();
    } else {
      this.conversationId = this.options.conversationId;
    }
  }

  private generateConversationId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private loadConversationHistory(): void {
    if (!this.session) return;

    const historyKey = `a2a-chat-history-${this.conversationId}`;
    const history = this.session.get(historyKey) as ChatMessage[];

    if (history && Array.isArray(history)) {
      this.messages = history.map((msg) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  }

  private saveConversationHistory(): void {
    if (!this.session || !this.options.persistMessages) return;

    const historyKey = `a2a-chat-history-${this.conversationId}`;

    // Limit history size
    const messagesToSave = this.messages.slice(-this.options.maxHistorySize);

    this.session.set(historyKey, messagesToSave);
  }

  private extractTextContent(parts: Part[]): string {
    return parts
      .filter((part) => part.type === 'text')
      .map((part) => part.content)
      .join(' ');
  }

  private createChatMessage(
    role: ChatMessage['role'],
    parts: Part[],
    messageId?: string
  ): ChatMessage {
    return {
      id: messageId || this.generateMessageId(),
      role,
      content: this.extractTextContent(parts),
      parts,
      timestamp: new Date(),
      conversationId: this.conversationId,
    };
  }

  private generateMessageId(): string {
    return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  getConversationId(): string {
    return this.conversationId;
  }

  getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  async send(content: string): Promise<ChatMessage> {
    const parts: Part[] = [{ type: 'text', content }];
    return this.sendMultipart(parts);
  }

  async sendMultipart(parts: Part[]): Promise<ChatMessage> {
    try {
      // Create user message
      const userMessage = this.createChatMessage('user', parts);
      this.messages.push(userMessage);
      this.emit('message', userMessage);
      this.saveConversationHistory();

      // Prepare A2A message
      const message: Message = {
        role: 'user',
        content: parts,
      };

      // Send to agent
      const task = await this.client.message.send({
        message,
        context: {
          conversationId: this.conversationId,
          ...this.context,
        },
      });

      // Wait for completion
      const completedTask = await this.client.task.waitForCompletion(task.id);

      // Find assistant response
      const assistantMessage = completedTask.messages.find((m) => m.role === 'assistant');

      if (!assistantMessage) {
        throw new Error('No assistant response received');
      }

      // Create chat message from response
      const responseMessage = this.createChatMessage(
        'assistant',
        assistantMessage.content,
        `msg-${completedTask.id}`
      );

      this.messages.push(responseMessage);
      this.emit('message', responseMessage);
      this.saveConversationHistory();

      return responseMessage;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  async stream(content: string, onUpdate: (update: StreamUpdate) => void): Promise<ChatMessage> {
    try {
      // Create user message
      const userMessage = this.createChatMessage('user', [{ type: 'text', content }]);
      this.messages.push(userMessage);
      this.emit('message', userMessage);
      this.saveConversationHistory();

      // Prepare message
      const message: Message = {
        role: 'user',
        content: [{ type: 'text', content }],
      };

      // Stream from agent
      const stream = this.client.message.stream({
        message,
        context: {
          conversationId: this.conversationId,
          ...this.context,
        },
      });

      let lastContent = '';
      let messageId = '';
      let finalMessage: ChatMessage | null = null;

      for await (const task of stream) {
        if (task.state === 'failed') {
          throw new Error(task.error?.message || 'Task failed');
        }

        const assistantMessage = task.messages.find((m) => m.role === 'assistant');

        if (assistantMessage) {
          const currentContent = this.extractTextContent(assistantMessage.content);
          messageId = `msg-${task.id}`;

          if (currentContent !== lastContent) {
            const update: StreamUpdate = {
              content: currentContent,
              isComplete: task.state === 'completed',
              messageId,
            };

            onUpdate(update);
            this.emit('streamUpdate', update);
            lastContent = currentContent;
          }

          if (task.state === 'completed') {
            finalMessage = this.createChatMessage('assistant', assistantMessage.content, messageId);
            break;
          }
        }
      }

      if (!finalMessage) {
        throw new Error('Stream ended without completion');
      }

      this.messages.push(finalMessage);
      this.emit('message', finalMessage);
      this.saveConversationHistory();

      return finalMessage;
    } catch (error) {
      this.emit('error', error as Error);
      throw error;
    }
  }

  clearConversation(): void {
    this.messages = [];
    this.saveConversationHistory();
  }

  newConversation(): void {
    this.conversationId = this.generateConversationId();
    this.messages = [];

    if (this.session) {
      this.session.set('a2a-conversation-id', this.conversationId);
    }

    this.emit('conversationStarted', { conversationId: this.conversationId });
    this.saveConversationHistory();
  }

  exportConversation(): ConversationExport {
    const firstMessage = this.messages[0];
    const lastMessage = this.messages[this.messages.length - 1];

    const startedAt = firstMessage ? firstMessage.timestamp : new Date();
    const lastMessageAt = lastMessage ? lastMessage.timestamp : new Date();

    return {
      conversationId: this.conversationId,
      messages: this.getMessages(),
      startedAt,
      lastMessageAt,
      messageCount: this.messages.length,
    };
  }

  destroy(): void {
    this.emit('conversationEnded', { conversationId: this.conversationId });
    this.removeAllListeners();
  }
}
