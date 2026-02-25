import { describe, it, expect, vi } from 'vitest';
import { A2AClient } from './a2a-client';
import type { AgentCard } from '../types';

// Mock http-client module
vi.mock('./http-client', () => {
  return {
    HttpClient: vi.fn().mockImplementation(() => ({
      post: vi.fn().mockRejectedValue(new Error('Network error')),
      get: vi.fn().mockResolvedValue({
        id: 'task-123',
        state: 'failed',
        createdAt: new Date().toISOString(),
        messages: [],
        error: {
          code: 'TASK_FAILED',
          message: 'Task execution failed',
        },
      }),
    })),
  };
});

describe('A2AClient edge cases', () => {
  it('should handle task errors in waitForCompletion', async () => {
    const mockAgentCard: AgentCard = {
      name: 'Test Agent',
      description: 'Test',
      version: '1.0.0',
      serviceEndpoint: 'https://api.test.com',
      capabilities: [],
    };

    const client = new A2AClient({ agentCard: mockAgentCard });

    // Wait for failed task
    const result = await client.task.waitForCompletion('task-123', {
      pollingInterval: 10,
      timeout: 100,
    });

    expect(result.state).toBe('failed');
    expect(result.error?.code).toBe('TASK_FAILED');
  });

  it('should handle cancelled tasks in waitForCompletion', async () => {
    const mockAgentCard: AgentCard = {
      name: 'Test Agent',
      description: 'Test',
      version: '1.0.0',
      serviceEndpoint: 'https://api.test.com',
      capabilities: [],
    };

    // Create new mock for this specific test
    const mockHttpClient = {
      get: vi.fn().mockResolvedValue({
        id: 'task-456',
        state: 'cancelled',
        createdAt: new Date().toISOString(),
        messages: [],
      }),
    };

    const client = new A2AClient({ agentCard: mockAgentCard });
    (client as any).httpClient = mockHttpClient;

    const result = await client.task.waitForCompletion('task-456', {
      pollingInterval: 10,
    });

    expect(result.state).toBe('cancelled');
  });
});
