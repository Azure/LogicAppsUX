import { describe, it, expect, vi, beforeEach } from 'vitest';
import { A2AClient } from '../a2a-client';
import type { AgentCard, Task } from '../../types';
import { getMockAgentCard } from '../../test-utils/mock-agent-card';

// Mock SSEClient
vi.mock('../../streaming/sse-client', () => {
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

describe('A2AClient - Artifact File Processing', () => {
  let client: A2AClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new A2AClient({ agentCard: mockAgentCard });
  });

  it('should process artifact-update events with file parts', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Generate an image' }],
      },
    };

    const updates: Task[] = [];
    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    // Start iteration
    const task1Promise = iterator.next();

    // Wait for SSE setup
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;

    // Simulate initial status update
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          contextId: 'ctx-456',
          status: {
            state: 'working',
            timestamp: new Date().toISOString(),
          },
        },
      },
    });
    const task1 = await task1Promise;
    updates.push(task1.value);

    // Simulate artifact-update with file part
    const task2Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-123',
          contextId: 'ctx-456',
          artifact: {
            artifactId: 'artifact-789',
            parts: [
              {
                kind: 'file',
                name: 'generated-image.png',
                mimeType: 'image/png',
                bytes:
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              },
            ],
          },
          append: false,
          lastChunk: false,
        },
      },
    });
    const task2 = await task2Promise;
    updates.push(task2.value);

    // Final status update
    const task3Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          contextId: 'ctx-456',
          status: {
            state: 'completed',
            timestamp: new Date().toISOString(),
          },
          final: true,
        },
      },
    });
    const task3 = await task3Promise;
    updates.push(task3.value);

    // Verify artifacts were accumulated
    expect(updates.length).toBeGreaterThanOrEqual(2);

    // Find the update with artifacts
    const updateWithArtifacts = updates.find((u) => u.artifacts && u.artifacts.length > 0);
    expect(updateWithArtifacts).toBeDefined();
    expect(updateWithArtifacts!.artifacts).toHaveLength(1);

    const artifact = updateWithArtifacts!.artifacts![0] as any;
    expect(artifact.artifactId).toBe('artifact-789');
    expect(artifact.parts).toHaveLength(1);
    expect(artifact.parts[0].kind).toBe('file');
    expect(artifact.parts[0].name).toBe('generated-image.png');
    expect(artifact.parts[0].mimeType).toBe('image/png');
  });

  it('should handle multiple file parts in a single artifact', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Generate images' }],
      },
    };

    const updates: Task[] = [];
    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    const task1Promise = iterator.next();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;

    // Simulate artifact-update with multiple file parts
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          contextId: 'ctx-456',
          status: {
            state: 'working',
            timestamp: new Date().toISOString(),
          },
        },
      },
    });
    const task1 = await task1Promise;
    updates.push(task1.value);

    const task2Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-123',
          contextId: 'ctx-456',
          artifact: {
            artifactId: 'multi-artifact',
            parts: [
              {
                kind: 'file',
                name: 'image1.png',
                mimeType: 'image/png',
                bytes: 'base64data1',
              },
              {
                kind: 'file',
                name: 'image2.jpg',
                mimeType: 'image/jpeg',
                bytes: 'base64data2',
              },
            ],
          },
          append: false,
          lastChunk: true,
        },
      },
    });
    const task2 = await task2Promise;
    updates.push(task2.value);

    const updateWithArtifacts = updates.find((u) => u.artifacts && u.artifacts.length > 0);
    expect(updateWithArtifacts).toBeDefined();

    const artifact = updateWithArtifacts!.artifacts![0] as any;
    expect(artifact.parts).toHaveLength(2);
    expect(artifact.parts[0].name).toBe('image1.png');
    expect(artifact.parts[1].name).toBe('image2.jpg');
  });

  it('should prevent duplicate artifacts with same artifactId', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Test' }],
      },
    };

    const updates: Task[] = [];
    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    const task1Promise = iterator.next();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;

    // Initial status
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          status: { state: 'working', timestamp: new Date().toISOString() },
        },
      },
    });
    await task1Promise;

    // First artifact
    const task2Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-123',
          artifact: {
            artifactId: 'dup-artifact',
            parts: [{ kind: 'file', name: 'file1.png', mimeType: 'image/png', bytes: 'data1' }],
          },
        },
      },
    });
    const task2 = await task2Promise;
    updates.push(task2.value);

    // Duplicate artifact (same artifactId)
    const task3Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-123',
          artifact: {
            artifactId: 'dup-artifact',
            parts: [{ kind: 'file', name: 'file1.png', mimeType: 'image/png', bytes: 'data1' }],
          },
        },
      },
    });
    const task3 = await task3Promise;
    updates.push(task3.value);

    // Final status
    const task4Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          status: { state: 'completed', timestamp: new Date().toISOString() },
          final: true,
        },
      },
    });
    await task4Promise;

    // Should have artifacts but no exact duplicates
    const lastUpdate = updates[updates.length - 1];
    if (lastUpdate.artifacts) {
      // Count artifacts with the same ID
      const artifactCount = lastUpdate.artifacts.filter(
        (a: any) => a.artifactId === 'dup-artifact'
      ).length;
      // Should only have 1 instance (duplicates should be prevented/updated)
      expect(artifactCount).toBe(1);
    }
  });

  it('should handle artifacts with both text and file parts', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Generate code and image' }],
      },
    };

    const updates: Task[] = [];
    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    const task1Promise = iterator.next();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;

    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          status: { state: 'working', timestamp: new Date().toISOString() },
        },
      },
    });
    await task1Promise;

    const task2Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-123',
          artifact: {
            artifactId: 'mixed-artifact',
            parts: [
              {
                kind: 'text',
                text: 'console.log("hello");',
              },
              {
                kind: 'file',
                name: 'screenshot.png',
                mimeType: 'image/png',
                bytes: 'base64imagedata',
              },
            ],
          },
        },
      },
    });
    const task2 = await task2Promise;
    updates.push(task2.value);

    const updateWithArtifacts = updates.find((u) => u.artifacts && u.artifacts.length > 0);
    expect(updateWithArtifacts).toBeDefined();

    const artifact = updateWithArtifacts!.artifacts![0] as any;
    expect(artifact.parts).toHaveLength(2);
    expect(artifact.parts[0].kind).toBe('text');
    expect(artifact.parts[1].kind).toBe('file');
  });

  it('should queue task updates when artifacts are received', async () => {
    const request = {
      message: {
        role: 'user' as const,
        content: [{ type: 'text' as const, content: 'Test' }],
      },
    };

    const stream = client.message.stream(request);
    const iterator = stream[Symbol.asyncIterator]();

    const task1Promise = iterator.next();
    await new Promise((resolve) => setTimeout(resolve, 50));
    const sseClient = (client as any).sseClient;

    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'status-update',
          taskId: 'task-123',
          status: { state: 'working', timestamp: new Date().toISOString() },
        },
      },
    });
    await task1Promise;

    // Send artifact - should trigger task update
    const task2Promise = iterator.next();
    sseClient?.simulateMessage({
      event: 'message',
      data: {
        result: {
          kind: 'artifact-update',
          taskId: 'task-123',
          artifact: {
            artifactId: 'test-artifact',
            parts: [{ kind: 'file', name: 'test.png', mimeType: 'image/png', bytes: 'data' }],
          },
        },
      },
    });
    const task2 = await task2Promise;

    // Should receive task update with artifacts
    expect(task2.value).toBeDefined();
    expect(task2.value.artifacts).toBeDefined();
    expect(task2.value.artifacts!.length).toBeGreaterThan(0);
  });
});
