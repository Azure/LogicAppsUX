import { describe, it, expect } from 'vitest';
import { TaskSchema, MessageSchema, PartSchema, TaskStateSchema } from './schemas';
import type { Task, Message, Part } from './schemas';

describe('Part schema', () => {
  it('should validate text part', () => {
    const textPart = {
      type: 'text',
      content: 'Hello, world!',
    };

    const result = PartSchema.safeParse(textPart);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('text');
      expect(result.data.content).toBe('Hello, world!');
    }
  });

  it('should validate file part', () => {
    const filePart = {
      type: 'file',
      mimeType: 'image/png',
      data: 'base64encodeddata',
      filename: 'image.png',
    };

    const result = PartSchema.safeParse(filePart);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('file');
      expect(result.data.mimeType).toBe('image/png');
    }
  });

  it('should validate structured data part', () => {
    const structuredPart = {
      type: 'structured',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
      },
      data: { name: 'Test' },
    };

    const result = PartSchema.safeParse(structuredPart);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('structured');
      expect(result.data.data).toEqual({ name: 'Test' });
    }
  });
});

describe('Message schema', () => {
  it('should validate user message', () => {
    const userMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          content: 'What is the weather today?',
        },
      ],
    };

    const result = MessageSchema.safeParse(userMessage);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('user');
      expect(result.data.content).toHaveLength(1);
    }
  });

  it('should validate assistant message with metadata', () => {
    const assistantMessage = {
      role: 'assistant',
      content: [
        {
          type: 'text',
          content: 'The weather is sunny today.',
        },
      ],
      metadata: {
        model: 'gpt-4',
        temperature: 0.7,
      },
    };

    const result = MessageSchema.safeParse(assistantMessage);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.role).toBe('assistant');
      expect(result.data.metadata?.model).toBe('gpt-4');
    }
  });

  it('should validate message with multiple parts', () => {
    const multiPartMessage = {
      role: 'user',
      content: [
        {
          type: 'text',
          content: 'Please analyze this image:',
        },
        {
          type: 'file',
          mimeType: 'image/jpeg',
          data: 'base64data',
          filename: 'photo.jpg',
        },
      ],
    };

    const result = MessageSchema.safeParse(multiPartMessage);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.content).toHaveLength(2);
      expect(result.data.content[1]?.type).toBe('file');
    }
  });
});

describe('Task schema', () => {
  it('should validate a pending task', () => {
    const pendingTask = {
      id: 'task-123',
      state: 'pending',
      createdAt: new Date().toISOString(),
      messages: [],
    };

    const result = TaskSchema.safeParse(pendingTask);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('pending');
      expect(result.data.id).toBe('task-123');
    }
  });

  it('should validate a completed task with messages', () => {
    const completedTask = {
      id: 'task-456',
      state: 'completed',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
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
      artifacts: [
        {
          id: 'artifact-1',
          type: 'text',
          title: 'Summary',
          content: 'Conversation summary...',
        },
      ],
    };

    const result = TaskSchema.safeParse(completedTask);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('completed');
      expect(result.data.messages).toHaveLength(2);
      expect(result.data.artifacts).toHaveLength(1);
    }
  });

  it('should validate task state enum', () => {
    const validStates = ['pending', 'running', 'completed', 'failed', 'cancelled'];

    validStates.forEach((state) => {
      const result = TaskStateSchema.safeParse(state);
      expect(result.success).toBe(true);
    });

    const invalidState = TaskStateSchema.safeParse('invalid');
    expect(invalidState.success).toBe(false);
  });

  it('should validate task with error information', () => {
    const failedTask = {
      id: 'task-789',
      state: 'failed',
      createdAt: new Date().toISOString(),
      messages: [],
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        details: {
          retryAfter: 60,
        },
      },
    };

    const result = TaskSchema.safeParse(failedTask);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.state).toBe('failed');
      expect(result.data.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });
});
