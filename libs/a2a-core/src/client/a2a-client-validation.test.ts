import { describe, it, expect, vi } from 'vitest';
import { A2AClient } from './a2a-client';
import type { AgentCard } from '../types';

// Mock http-client
vi.mock('./http-client', () => {
  return {
    HttpClient: vi.fn().mockImplementation(() => ({
      post: vi.fn().mockResolvedValue({
        id: 'invalid-task',
        // Missing required fields
      }),
      get: vi.fn().mockResolvedValue({
        invalid: 'response',
      }),
    })),
  };
});

describe('A2AClient validation errors', () => {
  let client: A2AClient;
  let mockAgentCard: AgentCard;

  beforeEach(() => {
    mockAgentCard = {
      name: 'Test Agent',
      description: 'Test',
      version: '1.0.0',
      serviceEndpoint: 'https://api.test.com',
      capabilities: [],
    };

    client = new A2AClient({ agentCard: mockAgentCard });
  });

  it('should handle invalid task response from send', async () => {
    await expect(
      client.message.send({
        message: {
          role: 'user',
          content: [{ type: 'text', content: 'Test' }],
        },
      })
    ).rejects.toThrow('Invalid task response');
  });

  it('should handle invalid task response from get', async () => {
    await expect(client.task.get('task-123')).rejects.toThrow('Invalid task response');
  });
});
