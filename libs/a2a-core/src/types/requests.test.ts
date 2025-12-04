import { describe, it, expect } from 'vitest';
import {
  MessageSendRequestSchema,
  MessageStreamRequestSchema,
  TaskGetRequestSchema,
  TaskCancelRequestSchema,
  PushSubscribeRequestSchema,
} from './schemas';

describe('Request schemas', () => {
  describe('MessageSendRequest', () => {
    it('should validate a simple text message request', () => {
      const request = {
        message: {
          role: 'user',
          content: [
            {
              type: 'text',
              content: 'Hello, agent!',
            },
          ],
        },
      };

      const result = MessageSendRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.message.content[0]?.type).toBe('text');
      }
    });

    it('should validate request with context and metadata', () => {
      const request = {
        message: {
          role: 'user',
          content: [
            {
              type: 'text',
              content: 'Continue our discussion',
            },
          ],
        },
        context: {
          conversationId: 'conv-123',
          previousTaskId: 'task-456',
        },
        metadata: {
          clientVersion: '1.0.0',
          timestamp: new Date().toISOString(),
        },
      };

      const result = MessageSendRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.context?.conversationId).toBe('conv-123');
        expect(result.data.metadata?.clientVersion).toBe('1.0.0');
      }
    });
  });

  describe('MessageStreamRequest', () => {
    it('should validate stream request with options', () => {
      const request = {
        message: {
          role: 'user',
          content: [
            {
              type: 'text',
              content: 'Tell me a long story',
            },
          ],
        },
        streamOptions: {
          includeUsage: true,
          includePartialArtifacts: true,
        },
      };

      const result = MessageStreamRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.streamOptions?.includeUsage).toBe(true);
      }
    });
  });

  describe('TaskGetRequest', () => {
    it('should validate task get request', () => {
      const request = {
        taskId: 'task-789',
      };

      const result = TaskGetRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskId).toBe('task-789');
      }
    });
  });

  describe('TaskCancelRequest', () => {
    it('should validate task cancel request', () => {
      const request = {
        taskId: 'task-999',
        reason: 'User requested cancellation',
      };

      const result = TaskCancelRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.taskId).toBe('task-999');
        expect(result.data.reason).toBe('User requested cancellation');
      }
    });
  });

  describe('PushSubscribeRequest', () => {
    it('should validate push subscription request', () => {
      const request = {
        endpoint: 'https://client.example.com/webhook',
        events: ['task.completed', 'task.failed'],
        metadata: {
          clientId: 'client-123',
        },
      };

      const result = PushSubscribeRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.endpoint).toBe('https://client.example.com/webhook');
        expect(result.data.events).toContain('task.completed');
      }
    });
  });
});
