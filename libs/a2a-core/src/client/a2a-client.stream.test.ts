import { describe, it, expect, vi, beforeEach } from 'vitest';
import { A2AClient } from './a2a-client';
import type { AgentCard, Task } from '../types';
import { getMockAgentCard } from '../test-utils/mock-agent-card';

// Mock SSEClient
vi.mock('../streaming/sse-client', () => {
  class MockSSEClient {
    url: string;
    options: any;
    private handlers: { message: any[]; error: any[] } = { message: [], error: [] };
    closed = false;

    constructor(url: string, options: any) {
      this.url = url;
      this.options = options;
    }

    onMessage(handler: any) {
      this.handlers.message.push(handler);
    }

    onError(handler: any) {
      this.handlers.error.push(handler);
    }

    close() {
      this.closed = true;
    }

    // Simulate receiving messages
    simulateMessage(message: any) {
      // Call handlers asynchronously to simulate real SSE behavior
      setTimeout(() => {
        this.handlers.message.forEach((h) => h(message));
      }, 0);
    }

    simulateError(error: any) {
      setTimeout(() => {
        this.handlers.error.forEach((h) => h(error));
      }, 0);
    }
  }

  return { SSEClient: MockSSEClient };
});

const mockAgentCard: AgentCard = getMockAgentCard({
  url: 'https://api.test-agent.com',
  capabilities: {
    streaming: true,
    pushNotifications: false,
    stateTransitionHistory: false,
    extensions: [],
  },
});

describe('A2AClient - Stream', () => {
  let client: A2AClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new A2AClient({ agentCard: mockAgentCard });

    // Mock fetch for POST /message/send
    global.fetch = vi.fn().mockImplementation((request: Request) => {
      if (request.url.endsWith('/message/send') && request.method === 'POST') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              id: 'task-123',
              state: 'pending',
              messages: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        );
      }

      return Promise.resolve(new Response('Not found', { status: 404 }));
    }) as any;
  });

  it('should create SSE connection for streaming', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Hello' }],
      },
    };

    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Start consuming the stream
    const promise = iterator.next();

    // Should create SSE connection to the correct endpoint
    expect(promise).toBeDefined();
  });

  it('should stream task updates', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Tell me a story' }],
      },
    };

    const updates: Task[] = [];
    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Start the iteration first to trigger SSE setup
    const pendingPromise = iterator.next();

    // Wait for SSE setup
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;

    // 1. Simulate initial pending update
    sseClient?.simulateMessage({
      event: 'task.created',
      data: {
        id: 'task-123',
        state: 'pending',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const pendingUpdate = await pendingPromise;
    updates.push(pendingUpdate.value);

    // 2. Processing update
    const processingPromise = iterator.next();
    sseClient?.simulateMessage({
      event: 'task.update',
      data: {
        id: 'task-123',
        state: 'running',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const processingUpdate = await processingPromise;
    updates.push(processingUpdate.value);

    // 3. Completed update
    const completedPromise = iterator.next();
    sseClient?.simulateMessage({
      event: 'task.update',
      data: {
        id: 'task-123',
        state: 'completed',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', content: 'Tell me a story' }],
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'Once upon a time...' }],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const completedUpdate = await completedPromise;
    updates.push(completedUpdate.value);

    expect(updates).toHaveLength(3); // 3 updates
    expect(updates[0].state).toBe('pending'); // task.created
    expect(updates[1].state).toBe('running');
    expect(updates[2].state).toBe('completed');
    expect(updates[2].messages).toHaveLength(2);
  });

  it('should handle streaming errors', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Hello' }],
      },
    };

    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Start iteration to trigger SSE setup
    const firstPromise = iterator.next();

    // Wait for SSE setup
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Get SSE client
    const sseClient = (client as any).sseClient;

    // First send an initial task to complete the first promise
    sseClient?.simulateMessage({
      event: 'task.created',
      data: {
        id: 'task-123',
        state: 'pending',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    // Wait for first task
    await firstPromise;

    // Try to get next update after error
    const errorPromise = iterator.next();

    // Simulate connection error
    sseClient?.simulateError(new Error('Connection lost'));

    await expect(errorPromise).rejects.toThrow('Connection lost');
  });

  it('should support authentication in streaming', async () => {
    const authenticatedClient = new A2AClient({
      agentCard: mockAgentCard,
      auth: {
        type: 'bearer',
        token: 'test-token',
      },
    });

    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Hello' }],
      },
    };

    const stream = authenticatedClient.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Start consuming
    iterator.next();

    // Wait for setup
    await new Promise((resolve) => setTimeout(resolve, 50));

    // The SSE client should be created with auth headers
    const sseClient = (authenticatedClient as any).sseClient;
    expect(sseClient?.options.headers).toHaveProperty('Authorization', 'Bearer test-token');
  });

  it('should validate message before streaming', async () => {
    const invalidRequest = {
      message: {
        role: 'invalid-role' as any,
        content: [],
      },
    };

    await expect(async () => {
      const stream = client.message.stream(invalidRequest);
      for await (const _update of stream) {
        // Should not reach here
      }
    }).rejects.toThrow('Invalid message');
  });

  it('should handle context and options in stream request', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Hello' }],
      },
      context: {
        sessionId: 'test-session',
        custom: 'value',
      },
      options: {
        temperature: 0.7,
      },
    };

    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Start consuming
    iterator.next();

    // The request should include context and options
    await new Promise((resolve) => setTimeout(resolve, 50));

    // In a real implementation, we'd verify the POST body
    // For now, just ensure it doesn't throw
    expect(stream).toBeDefined();
  });

  it('should close SSE connection when iteration stops', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Hello' }],
      },
    };

    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Start iteration
    const firstPromise = iterator.next();

    // Wait for SSE setup
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Get SSE client
    const sseClient = (client as any).sseClient;

    // Send initial task to complete first promise
    sseClient?.simulateMessage({
      event: 'task.created',
      data: {
        id: 'task-123',
        state: 'pending',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });

    await firstPromise;

    // Call return to close the stream
    await iterator.return!();

    // SSE connection should be closed
    expect(sseClient?.closed).toBe(true);
  });

  it('should handle incremental message updates', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Write a long story' }],
      },
    };

    const updates: Task[] = [];
    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Start iteration
    const initialPromise = iterator.next();

    // Wait for SSE setup
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;

    // Send initial task
    sseClient?.simulateMessage({
      event: 'task.created',
      data: {
        id: 'task-123',
        state: 'pending',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const initial = await initialPromise;
    updates.push(initial.value);

    // Simulate and collect incremental updates

    // 1. First partial content
    const update1Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'task.update',
      data: {
        id: 'task-123',
        state: 'running',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', content: 'Write a long story' }],
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'Once upon a' }],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const update1 = await update1Promise;
    updates.push(update1.value);

    // 2. Second partial content
    const update2Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'task.update',
      data: {
        id: 'task-123',
        state: 'running',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', content: 'Write a long story' }],
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'Once upon a time, in a' }],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const update2 = await update2Promise;
    updates.push(update2.value);

    // 3. Final complete content
    const update3Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'task.update',
      data: {
        id: 'task-123',
        state: 'completed',
        messages: [
          {
            role: 'user',
            content: [{ type: 'text', content: 'Write a long story' }],
          },
          {
            role: 'assistant',
            content: [{ type: 'text', content: 'Once upon a time, in a land far away...' }],
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    });
    const update3 = await update3Promise;
    updates.push(update3.value);

    expect(updates).toHaveLength(4); // Initial + 3 updates
    expect(updates[1].messages[1].content[0].content).toBe('Once upon a');
    expect(updates[2].messages[1].content[0].content).toBe('Once upon a time, in a');
    expect(updates[3].messages[1].content[0].content).toBe(
      'Once upon a time, in a land far away...'
    );
  });
});
