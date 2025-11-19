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

describe('A2AClient - Message and Artifact Accumulation', () => {
  let client: A2AClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new A2AClient({ agentCard: mockAgentCard });
  });

  it('should accumulate messages across status updates instead of replacing them', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Generate a hello world program' }],
      },
    };

    const updates: Task[] = [];
    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // 1. Initial task creation - start iteration first
    const task1Promise = iterator.next();

    // Wait for SSE setup
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;

    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'task',
          id: 'task-123',
          status: {
            state: 'submitted',
            timestamp: new Date().toISOString(),
          },
        },
      },
    });
    const task1 = await task1Promise;
    updates.push(task1.value);

    // Small delay to ensure proper ordering
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 2. First status update with a message
    const task2Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          status: {
            state: 'running',
            timestamp: new Date().toISOString(),
            message: {
              role: 'agent',
              parts: [{ kind: 'text', text: 'Generating code...' }],
            },
          },
        },
      },
    });
    const task2 = await task2Promise;
    updates.push(task2.value);

    // 3. Artifact update
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-123',
          artifact: {
            id: 'artifact-1',
            type: 'code',
            title: 'Program.cs',
            content: 'Console.WriteLine("Hello, World!");',
          },
        },
      },
    });
    // Note: artifact updates should be accumulated but not trigger a new task update
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 4. Second status update with another message
    const task4Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          status: {
            state: 'running',
            timestamp: new Date().toISOString(),
            message: {
              role: 'agent',
              parts: [{ kind: 'text', text: 'Generated files: Program.cs' }],
            },
          },
        },
      },
    });
    const task4 = await task4Promise;
    updates.push(task4.value);

    // 5. Final status update
    const task5Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          status: {
            state: 'completed',
            timestamp: new Date().toISOString(),
          },
          final: true,
        },
      },
    });
    const task5 = await task5Promise;
    updates.push(task5.value);

    // Verify accumulation
    expect(updates).toHaveLength(4); // task creation + 3 status updates (artifact update doesn't emit)

    // Check first update (task creation)
    expect(updates[0].id).toBe('task-123');
    expect(updates[0].state).toBe('pending');
    expect(updates[0].messages).toHaveLength(0);

    // Check second update (first status with message)
    expect(updates[1].id).toBe('task-123');
    expect(updates[1].state).toBe('running');
    expect(updates[1].messages).toHaveLength(1);
    expect(updates[1].messages[0].content[0]).toEqual({
      type: 'text',
      content: 'Generating code...',
    });

    // Check third update (after artifact, second status with message)
    expect(updates[2].id).toBe('task-123');
    expect(updates[2].state).toBe('running');
    expect(updates[2].messages).toHaveLength(2); // Should have BOTH messages
    expect(updates[2].messages[0].content[0]).toEqual({
      type: 'text',
      content: 'Generating code...',
    });
    expect(updates[2].messages[1].content[0]).toEqual({
      type: 'text',
      content: 'Generated files: Program.cs',
    });
    expect(updates[2].artifacts).toBeDefined();
    expect(updates[2].artifacts).toHaveLength(1);
    expect(updates[2].artifacts![0]).toEqual({
      id: 'artifact-1',
      type: 'code',
      title: 'Program.cs',
      content: 'Console.WriteLine("Hello, World!");',
    });

    // Check final update
    expect(updates[3].id).toBe('task-123');
    expect(updates[3].state).toBe('completed');
    expect(updates[3].messages).toHaveLength(2); // Should still have both messages
    expect(updates[3].artifacts).toHaveLength(1); // Should still have the artifact
  });

  it('should handle multiple artifacts properly', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Create a web app' }],
      },
    };

    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Initial task - start iteration first
    const task1Promise = iterator.next();

    // Wait for SSE setup
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'task',
          id: 'task-456',
          status: {
            state: 'submitted',
            timestamp: new Date().toISOString(),
          },
        },
      },
    });
    await task1Promise;

    // Add multiple artifacts
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-456',
          artifact: {
            id: 'artifact-1',
            type: 'code',
            title: 'index.html',
            content: '<html>...</html>',
          },
        },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-456',
          artifact: {
            id: 'artifact-2',
            type: 'code',
            title: 'styles.css',
            content: 'body { margin: 0; }',
          },
        },
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Get final status
    const finalPromise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-456',
          status: {
            state: 'completed',
            timestamp: new Date().toISOString(),
            message: {
              role: 'agent',
              parts: [{ kind: 'text', text: 'Created web app with 2 files' }],
            },
          },
          final: true,
        },
      },
    });
    const finalUpdate = await finalPromise;

    // Verify multiple artifacts are accumulated
    expect(finalUpdate.value.artifacts).toHaveLength(2);
    expect(finalUpdate.value.artifacts![0].title).toBe('index.html');
    expect(finalUpdate.value.artifacts![1].title).toBe('styles.css');
    expect(finalUpdate.value.messages).toHaveLength(1);
  });
});
