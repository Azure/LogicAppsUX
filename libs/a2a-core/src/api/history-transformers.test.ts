import { describe, it, expect } from 'vitest';
import {
  transformContext,
  transformTasksToMessages,
  transformMessage,
  transformMessageParts,
  transformMessageToServer,
} from './history-transformers';
import type { ServerContext, ServerTask, ServerMessage, ServerMessagePart } from './history-types';

describe('History Transformers', () => {
  describe('transformContext', () => {
    it('should transform a complete server context with name', () => {
      const serverContext: ServerContext = {
        id: 'context-123',
        name: 'My Chat',
        isArchived: false,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 1:30:00 PM',
        status: 'Running',
      };

      const result = transformContext(serverContext);

      expect(result.id).toBe('context-123');
      expect(result.name).toBe('My Chat');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
      expect(result.lastMessage).toBeUndefined();
      expect(result.messageCount).toBeUndefined();
    });

    it('should use context id as name when name is missing', () => {
      const serverContext: ServerContext = {
        id: 'context-456',
        // name is undefined
        isArchived: false,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 1:30:00 PM',
        status: 'Running',
      };

      const result = transformContext(serverContext);

      expect(result.name).toBe('context-456'); // Fallback to id
    });

    it('should extract last message from lastTask', () => {
      const serverContext: ServerContext = {
        id: 'context-789',
        isArchived: false,
        createdAt: '10/29/2025 12:00:00 AM',
        updatedAt: '10/29/2025 1:30:00 PM',
        status: 'Running',
        lastTask: {
          id: 'task-1',
          contextId: 'context-789',
          taskStatus: {
            state: 'completed',
            message: {
              messageId: 'msg-1',
              taskId: 'task-1',
              contextId: 'context-789',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Hello!' }],
              metadata: { timestamp: '10/29/2025 1:00:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 1:00:05 PM',
          },
          status: {
            state: 'completed',
            message: {
              messageId: 'msg-1',
              taskId: 'task-1',
              contextId: 'context-789',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Hello!' }],
              metadata: { timestamp: '10/29/2025 1:00:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 1:00:05 PM',
          },
          history: [
            {
              messageId: 'msg-1',
              taskId: 'task-1',
              contextId: 'context-789',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Hello!' }],
              metadata: { timestamp: '10/29/2025 1:00:00 PM' },
              kind: 'message',
            },
            {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-789',
              role: 'user',
              parts: [{ kind: 'text', text: 'Hi' }],
              metadata: { timestamp: '10/29/2025 12:59:00 PM' },
              kind: 'message',
            },
          ],
          kind: 'task',
        },
      };

      const result = transformContext(serverContext);

      expect(result.lastMessage).toBeDefined();
      expect(result.lastMessage?.id).toBe('msg-1');
      expect(result.lastMessage?.role).toBe('assistant'); // Transformed from 'agent'
      expect(result.messageCount).toBe(2);
    });
  });

  describe('transformMessage', () => {
    it('should transform agent message to assistant', () => {
      const serverMessage: ServerMessage = {
        messageId: 'msg-123',
        taskId: 'task-456',
        contextId: 'context-789',
        role: 'agent', // Lowercase as per actual API
        parts: [{ kind: 'text', text: 'Hello, how can I help?' }],
        metadata: { timestamp: '10/29/2025 2:00:00 PM' },
        kind: 'message',
      };

      const result = transformMessage(serverMessage);

      expect(result).toEqual({
        id: 'msg-123',
        role: 'assistant', // Transformed from 'agent'
        content: [{ type: 'text', text: 'Hello, how can I help?' }],
        timestamp: new Date('2025-10-29T14:00:00Z'),
        contextId: 'context-789',
      });
    });

    it('should keep user role as user', () => {
      const serverMessage: ServerMessage = {
        messageId: 'msg-456',
        taskId: 'task-789',
        contextId: 'context-123',
        role: 'user',
        parts: [{ kind: 'text', text: 'I need help' }],
        metadata: { timestamp: '10/29/2025 2:00:00 PM' },
        kind: 'message',
      };

      const result = transformMessage(serverMessage);

      expect(result.role).toBe('user');
    });

    it('should parse date from metadata.timestamp', () => {
      const serverMessage: ServerMessage = {
        messageId: 'msg-789',
        taskId: 'task-123',
        contextId: 'context-456',
        role: 'user',
        parts: [{ kind: 'text', text: 'Test' }],
        metadata: { timestamp: '10/29/2025 3:30:45 PM' },
        kind: 'message',
      };

      const result = transformMessage(serverMessage);

      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.timestamp.toISOString()).toBe('2025-10-29T15:30:45.000Z');
    });
  });

  describe('transformMessageParts', () => {
    it('should transform text parts', () => {
      const parts: ServerMessagePart[] = [
        { kind: 'text', text: 'Hello world' },
        { kind: 'text', text: 'How are you?' },
      ];

      const result = transformMessageParts(parts);

      expect(result).toEqual([
        { type: 'text', text: 'Hello world' },
        { type: 'text', text: 'How are you?' },
      ]);
    });

    it('should transform data parts', () => {
      const parts: ServerMessagePart[] = [
        { kind: 'data', data: { foo: 'bar' } },
        { kind: 'data', data: [1, 2, 3] },
      ];

      const result = transformMessageParts(parts);

      expect(result).toEqual([
        { type: 'data', data: { foo: 'bar' } },
        { type: 'data', data: [1, 2, 3] },
      ]);
    });

    it('should transform mixed parts', () => {
      const parts: ServerMessagePart[] = [
        { kind: 'text', text: 'Here is the data:' },
        { kind: 'data', data: { result: 42 } },
        { kind: 'text', text: 'End of response' },
      ];

      const result = transformMessageParts(parts);

      expect(result).toEqual([
        { type: 'text', text: 'Here is the data:' },
        { type: 'data', data: { result: 42 } },
        { type: 'text', text: 'End of response' },
      ]);
    });
  });

  describe('transformTasksToMessages', () => {
    it('should flatten multiple tasks into message array', () => {
      const serverTasks: ServerTask[] = [
        {
          id: 'task-1',
          contextId: 'context-1',
          taskStatus: {
            state: 'completed',
            message: {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response 1' }],
              metadata: { timestamp: '10/29/2025 12:01:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:01:05 PM',
          },
          status: {
            state: 'completed',
            message: {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response 1' }],
              metadata: { timestamp: '10/29/2025 12:01:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:01:05 PM',
          },
          history: [
            {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response 1' }],
              metadata: { timestamp: '10/29/2025 12:01:00 PM' },
              kind: 'message',
            },
            {
              messageId: 'msg-1',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Query 1' }],
              metadata: { timestamp: '10/29/2025 12:00:00 PM' },
              kind: 'message',
            },
          ],
          kind: 'task',
        },
        {
          id: 'task-2',
          contextId: 'context-1',
          taskStatus: {
            state: 'completed',
            message: {
              messageId: 'msg-4',
              taskId: 'task-2',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response 2' }],
              metadata: { timestamp: '10/29/2025 12:03:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:03:05 PM',
          },
          status: {
            state: 'completed',
            message: {
              messageId: 'msg-4',
              taskId: 'task-2',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response 2' }],
              metadata: { timestamp: '10/29/2025 12:03:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:03:05 PM',
          },
          history: [
            {
              messageId: 'msg-4',
              taskId: 'task-2',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Response 2' }],
              metadata: { timestamp: '10/29/2025 12:03:00 PM' },
              kind: 'message',
            },
            {
              messageId: 'msg-3',
              taskId: 'task-2',
              contextId: 'context-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Query 2' }],
              metadata: { timestamp: '10/29/2025 12:02:00 PM' },
              kind: 'message',
            },
          ],
          kind: 'task',
        },
      ];

      const result = transformTasksToMessages(serverTasks);

      expect(result).toHaveLength(4);
      // Should be sorted chronologically
      expect(result[0].id).toBe('msg-1'); // First user message
      expect(result[1].id).toBe('msg-2'); // First agent response
      expect(result[2].id).toBe('msg-3'); // Second user message
      expect(result[3].id).toBe('msg-4'); // Second agent response
    });

    it('should handle reverse chronological history', () => {
      // Test where history is newest-first (reverse chronological)
      const serverTasks: ServerTask[] = [
        {
          id: 'task-1',
          contextId: 'context-1',
          taskStatus: {
            state: 'completed',
            message: {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Later message' }],
              metadata: { timestamp: '10/29/2025 12:05:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:05:05 PM',
          },
          status: {
            state: 'completed',
            message: {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Later message' }],
              metadata: { timestamp: '10/29/2025 12:05:00 PM' },
              kind: 'message',
            },
            timestamp: '10/29/2025 12:05:05 PM',
          },
          history: [
            // Reverse chronological - newest first
            {
              messageId: 'msg-2',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'agent',
              parts: [{ kind: 'text', text: 'Later message' }],
              metadata: { timestamp: '10/29/2025 12:05:00 PM' },
              kind: 'message',
            },
            {
              messageId: 'msg-1',
              taskId: 'task-1',
              contextId: 'context-1',
              role: 'user',
              parts: [{ kind: 'text', text: 'Earlier message' }],
              metadata: { timestamp: '10/29/2025 12:00:00 PM' },
              kind: 'message',
            },
          ],
          kind: 'task',
        },
      ];

      const result = transformTasksToMessages(serverTasks);

      // Should be sorted to chronological order
      expect(result[0].id).toBe('msg-1'); // Earlier message first
      expect(result[1].id).toBe('msg-2'); // Later message second
    });

    it('should preserve task exchanges when message timestamps are equal', () => {
      const timestamp = '10/29/2025 12:00:00 PM';
      const createMessage = (messageId: string, taskId: string, role: 'user' | 'agent'): ServerMessage => ({
        messageId,
        taskId,
        contextId: 'context-1',
        role,
        parts: [{ kind: 'text', text: messageId }],
        metadata: { timestamp },
        kind: 'message',
      });
      const createTask = (taskId: string, userMessageId: string, agentMessageId: string): ServerTask => {
        const agentMessage = createMessage(agentMessageId, taskId, 'agent');
        const userMessage = createMessage(userMessageId, taskId, 'user');
        const taskStatus = {
          state: 'completed',
          message: agentMessage,
          timestamp,
        };

        return {
          id: taskId,
          contextId: 'context-1',
          taskStatus,
          status: taskStatus,
          history: [agentMessage, userMessage],
          kind: 'task',
        };
      };
      const serverTasks = [createTask('task-1', 'user-1', 'agent-1'), createTask('task-2', 'user-2', 'agent-2')];

      const result = transformTasksToMessages(serverTasks);

      expect(result.map((message) => message.id)).toEqual(['user-1', 'agent-1', 'user-2', 'agent-2']);
    });

    it('should keep messages chronological when task times overlap', () => {
      const createMessage = (messageId: string, taskId: string, role: 'user' | 'agent', timestamp: string): ServerMessage => ({
        messageId,
        taskId,
        contextId: 'context-1',
        role,
        parts: [{ kind: 'text', text: messageId }],
        metadata: { timestamp },
        kind: 'message',
      });
      const createTask = (taskId: string, userTime: string, agentTime: string): ServerTask => {
        const agentMessage = createMessage(`${taskId}-agent`, taskId, 'agent', agentTime);
        const userMessage = createMessage(`${taskId}-user`, taskId, 'user', userTime);
        const taskStatus = {
          state: 'completed',
          message: agentMessage,
          timestamp: agentTime,
        };

        return {
          id: taskId,
          contextId: 'context-1',
          taskStatus,
          status: taskStatus,
          history: [agentMessage, userMessage],
          kind: 'task',
        };
      };
      const serverTasks = [
        createTask('task-1', '10/29/2025 12:00:00 PM', '10/29/2025 12:10:00 PM'),
        createTask('task-2', '10/29/2025 12:05:00 PM', '10/29/2025 12:06:00 PM'),
      ];

      const result = transformTasksToMessages(serverTasks);

      expect(result.map((message) => message.id)).toEqual(['task-1-user', 'task-2-user', 'task-2-agent', 'task-1-agent']);
    });
  });

  describe('transformMessageToServer', () => {
    it('should transform assistant message back to agent', () => {
      const message = {
        id: 'msg-123',
        role: 'assistant' as const,
        content: [{ type: 'text' as const, text: 'Hello!' }],
        timestamp: new Date('10/29/2025 2:00:00 PM'),
        contextId: 'context-789',
      };

      const result = transformMessageToServer(message);

      expect(result.role).toBe('agent'); // Transformed back
      expect(result.messageId).toBe('msg-123');
      expect(result.parts).toEqual([{ kind: 'text', text: 'Hello!' }]);
    });

    it('should keep user role as user', () => {
      const message = {
        id: 'msg-456',
        role: 'user' as const,
        content: [{ type: 'text' as const, text: 'Hi' }],
        timestamp: new Date(),
        contextId: 'context-123',
      };

      const result = transformMessageToServer(message);

      expect(result.role).toBe('user');
    });

    it('should transform content parts back to server format', () => {
      const message = {
        id: 'msg-789',
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'Text part' },
          { type: 'data' as const, data: { foo: 'bar' } },
        ],
        timestamp: new Date(),
        contextId: 'context-456',
      };

      const result = transformMessageToServer(message);

      expect(result.parts).toEqual([
        { kind: 'text', text: 'Text part' },
        { kind: 'data', data: { foo: 'bar' } },
      ]);
    });
  });
});
