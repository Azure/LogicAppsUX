import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatInterface } from './chat-interface';
import { A2AClient } from '../client/a2a-client';
import { SessionManager } from '../session/session-manager';
import type { Message, Task, AgentCard } from '../types';
import type { ChatOptions, ChatMessage, ChatEventMap } from './types';

// Mock dependencies
vi.mock('../client/a2a-client');
vi.mock('../session/session-manager');

describe('ChatInterface', () => {
  let mockClient: A2AClient;
  let mockSession: SessionManager;
  let mockAgentCard: AgentCard;

  beforeEach(() => {
    vi.clearAllMocks();

    mockAgentCard = {
      name: 'Test Agent',
      description: 'A test agent',
      version: '1.0.0',
      serviceEndpoint: 'https://api.test.com',
      capabilities: [{ name: 'text-generation', description: 'Can generate text' }],
    };

    mockClient = new A2AClient({ agentCard: mockAgentCard });
    mockSession = new SessionManager();

    // Mock client methods
    mockClient.message = {
      send: vi.fn(),
      stream: vi.fn(),
    };

    mockClient.task = {
      get: vi.fn(),
      cancel: vi.fn(),
      waitForCompletion: vi.fn(),
    };

    // Mock session methods
    mockSession.get = vi.fn();
    mockSession.set = vi.fn();
    mockSession.on = vi.fn();
  });

  describe('initialization', () => {
    it('should create chat interface with default options', () => {
      const chat = new ChatInterface({ client: mockClient });

      expect(chat).toBeDefined();
      expect(chat.getConversationId()).toBeDefined();
    });

    it('should use existing conversation ID from session', () => {
      const existingId = 'existing-conv-123';
      mockSession.get.mockReturnValue(existingId);

      const chat = new ChatInterface({
        client: mockClient,
        session: mockSession,
      });

      expect(chat.getConversationId()).toBe(existingId);
    });

    it('should restore conversation history from session', () => {
      const history: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2024-01-01'),
          conversationId: 'conv-123',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date('2024-01-01'),
          conversationId: 'conv-123',
        },
      ];

      mockSession.get.mockImplementation((key: string) => {
        if (key === 'a2a-chat-history-conv-123') return history;
        if (key === 'a2a-conversation-id') return 'conv-123';
        return undefined;
      });

      const chat = new ChatInterface({
        client: mockClient,
        session: mockSession,
      });

      const messages = chat.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].content).toBe('Hi there!');
    });
  });

  describe('sending messages', () => {
    it('should send text message and return response', async () => {
      const mockTask: Task = {
        id: 'task-123',
        state: 'completed',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', content: 'Hello' }],
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'Hi there!' }],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClient.message.send.mockResolvedValue(mockTask);
      mockClient.task.waitForCompletion.mockResolvedValue(mockTask);

      const chat = new ChatInterface({ client: mockClient });
      const response = await chat.send('Hello');

      expect(response).toBeDefined();
      expect(response.role).toBe('assistant');
      expect(response.content).toBe('Hi there!');
      expect(mockClient.message.send).toHaveBeenCalledWith({
        message: {
          role: 'user',
          content: [{ type: 'text', content: 'Hello' }],
        },
        context: expect.objectContaining({
          conversationId: expect.any(String),
        }),
      });
    });

    it('should add messages to history', async () => {
      const mockTask: Task = {
        id: 'task-123',
        state: 'completed',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', content: 'Hello' }],
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'Hi!' }],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClient.message.send.mockResolvedValue(mockTask);
      mockClient.task.waitForCompletion.mockResolvedValue(mockTask);

      const chat = new ChatInterface({ client: mockClient });

      expect(chat.getMessages()).toHaveLength(0);

      await chat.send('Hello');

      const messages = chat.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('Hello');
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toBe('Hi!');
    });

    it('should persist messages to session when enabled', async () => {
      const mockTask: Task = {
        id: 'task-123',
        state: 'completed',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', content: 'Test' }],
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'Response' }],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClient.message.send.mockResolvedValue(mockTask);
      mockClient.task.waitForCompletion.mockResolvedValue(mockTask);

      const chat = new ChatInterface({
        client: mockClient,
        session: mockSession,
        persistMessages: true,
      });

      await chat.send('Test');

      expect(mockSession.set).toHaveBeenCalledWith(
        expect.stringContaining('a2a-chat-history'),
        expect.arrayContaining([
          expect.objectContaining({ role: 'user', content: 'Test' }),
          expect.objectContaining({ role: 'assistant', content: 'Response' }),
        ])
      );
    });

    it('should handle multi-part messages', async () => {
      const mockTask: Task = {
        id: 'task-123',
        state: 'completed',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', content: 'Look at this:' },
              { type: 'file', mimeType: 'image/png', data: 'base64data', filename: 'test.png' },
            ],
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'I see an image' }],
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClient.message.send.mockResolvedValue(mockTask);
      mockClient.task.waitForCompletion.mockResolvedValue(mockTask);

      const chat = new ChatInterface({ client: mockClient });

      const response = await chat.sendMultipart([
        { type: 'text', content: 'Look at this:' },
        { type: 'file', mimeType: 'image/png', data: 'base64data', filename: 'test.png' },
      ]);

      expect(response.content).toBe('I see an image');
      expect(mockClient.message.send).toHaveBeenCalledWith({
        message: {
          role: 'user',
          content: [
            { type: 'text', content: 'Look at this:' },
            { type: 'file', mimeType: 'image/png', data: 'base64data', filename: 'test.png' },
          ],
        },
        context: expect.any(Object),
      });
    });

    it('should include conversation context', async () => {
      const chat = new ChatInterface({
        client: mockClient,
        context: {
          userId: 'user-123',
          sessionId: 'session-456',
        },
      });

      const mockTask: Task = {
        id: 'task-123',
        state: 'completed',
        messages: [
          { role: 'user', content: [{ type: 'text', content: 'Hello' }] },
          { role: 'assistant', content: [{ type: 'text', content: 'Hi!' }] },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClient.message.send.mockResolvedValue(mockTask);
      mockClient.task.waitForCompletion.mockResolvedValue(mockTask);

      await chat.send('Hello');

      expect(mockClient.message.send).toHaveBeenCalledWith({
        message: expect.any(Object),
        context: expect.objectContaining({
          conversationId: expect.any(String),
          userId: 'user-123',
          sessionId: 'session-456',
        }),
      });
    });
  });

  describe('streaming messages', () => {
    it('should stream responses', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-123',
          state: 'running',
          messages: [
            { role: 'user', content: [{ type: 'text', content: 'Tell me a story' }] },
            { role: 'assistant', content: [{ type: 'text', content: 'Once upon' }] },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'task-123',
          state: 'running',
          messages: [
            { role: 'user', content: [{ type: 'text', content: 'Tell me a story' }] },
            { role: 'assistant', content: [{ type: 'text', content: 'Once upon a time' }] },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'task-123',
          state: 'completed',
          messages: [
            { role: 'user', content: [{ type: 'text', content: 'Tell me a story' }] },
            { role: 'assistant', content: [{ type: 'text', content: 'Once upon a time...' }] },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      // Create async iterable from mock tasks
      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const task of mockTasks) {
            yield task;
          }
        },
      };

      mockClient.message.stream.mockReturnValue(mockStream);

      const chat = new ChatInterface({ client: mockClient });
      const updates: string[] = [];

      await chat.stream('Tell me a story', (update) => {
        updates.push(update.content);
      });

      expect(updates).toEqual(['Once upon', 'Once upon a time', 'Once upon a time...']);
      expect(chat.getMessages()).toHaveLength(2);
    });

    it('should handle streaming errors', async () => {
      const errorStream = {
        [Symbol.asyncIterator]: async function* () {
          yield {
            id: 'task-123',
            state: 'failed',
            error: { message: 'Connection lost' },
            messages: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        },
      };

      mockClient.message.stream.mockReturnValue(errorStream);

      const chat = new ChatInterface({ client: mockClient });

      await expect(chat.stream('Test', () => {})).rejects.toThrow('Connection lost');
    });
  });

  describe('conversation management', () => {
    it('should clear conversation', () => {
      const chat = new ChatInterface({
        client: mockClient,
        session: mockSession,
      });

      // Add some mock history
      (chat as any).messages = [
        { id: 'msg-1', role: 'user', content: 'Hi' },
        { id: 'msg-2', role: 'assistant', content: 'Hello' },
      ];

      chat.clearConversation();

      expect(chat.getMessages()).toHaveLength(0);
      expect(mockSession.set).toHaveBeenCalledWith(expect.stringContaining('a2a-chat-history'), []);
    });

    it('should start new conversation', () => {
      const oldId = 'old-conv-123';
      mockSession.get.mockReturnValue(oldId);

      const chat = new ChatInterface({
        client: mockClient,
        session: mockSession,
      });

      expect(chat.getConversationId()).toBe(oldId);

      chat.newConversation();

      const newId = chat.getConversationId();
      expect(newId).not.toBe(oldId);
      expect(chat.getMessages()).toHaveLength(0);
    });

    it('should export conversation history', () => {
      const messages: ChatMessage[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: new Date('2024-01-01T10:00:00Z'),
          conversationId: 'conv-123',
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Hi there!',
          timestamp: new Date('2024-01-01T10:01:00Z'),
          conversationId: 'conv-123',
        },
      ];

      const chat = new ChatInterface({ client: mockClient });
      (chat as any).messages = messages;

      const exported = chat.exportConversation();

      expect(exported).toMatchObject({
        conversationId: expect.any(String),
        messages: messages,
        startedAt: messages[0].timestamp,
        lastMessageAt: messages[1].timestamp,
        messageCount: 2,
      });
    });
  });

  describe('event handling', () => {
    it('should emit message events', async () => {
      const mockTask: Task = {
        id: 'task-123',
        state: 'completed',
        messages: [
          { role: 'user', content: [{ type: 'text', content: 'Hi' }] },
          { role: 'assistant', content: [{ type: 'text', content: 'Hello!' }] },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockClient.message.send.mockResolvedValue(mockTask);
      mockClient.task.waitForCompletion.mockResolvedValue(mockTask);

      const chat = new ChatInterface({ client: mockClient });
      const messageHandler = vi.fn();

      chat.on('message', messageHandler);
      await chat.send('Hi');

      expect(messageHandler).toHaveBeenCalledTimes(2);
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'user', content: 'Hi' })
      );
      expect(messageHandler).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'assistant', content: 'Hello!' })
      );
    });

    it('should emit error events', async () => {
      const error = new Error('Network error');
      mockClient.message.send.mockRejectedValue(error);

      const chat = new ChatInterface({ client: mockClient });
      const errorHandler = vi.fn();

      chat.on('error', errorHandler);

      await expect(chat.send('Test')).rejects.toThrow('Network error');
      expect(errorHandler).toHaveBeenCalledWith(error);
    });
  });

  describe('cleanup', () => {
    it('should clean up resources', () => {
      const chat = new ChatInterface({
        client: mockClient,
        session: mockSession,
      });

      chat.destroy();

      // Should remove all listeners
      expect(chat.listenerCount('message')).toBe(0);
      expect(chat.listenerCount('error')).toBe(0);
    });
  });
});
