import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicAgentRegistry, EnterpriseAgentRegistry } from './registry';
import type { AgentCard } from '../types';
import { getMockAgentCard } from '../test-utils/mock-agent-card';

// Mock fetch globally
global.fetch = vi.fn();

describe('PublicAgentRegistry', () => {
  let registry: PublicAgentRegistry;

  beforeEach(() => {
    registry = new PublicAgentRegistry('https://registry.a2a.io');
    vi.clearAllMocks();
  });

  it('should search for agents', async () => {
    const mockResults = {
      agents: [
        {
          id: 'agent-1',
          name: 'Test Agent 1',
          description: 'First test agent',
          version: '1.0.0',
        },
        {
          id: 'agent-2',
          name: 'Test Agent 2',
          description: 'Second test agent',
          version: '2.0.0',
        },
      ],
    };

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const results = await registry.searchAgents('test');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://registry.a2a.io/search?q=test',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
        },
      })
    );
    expect(results).toHaveLength(2);
    expect(results[0]?.name).toBe('Test Agent 1');
  });

  it('should get agent card by ID', async () => {
    const mockAgentCard: AgentCard = getMockAgentCard({
      name: 'Test Agent',
      description: 'A test agent',
      version: '1.0.0',
      url: 'https://api.test-agent.com',
    });

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAgentCard,
    } as Response);

    const agentCard = await registry.getAgentCard('agent-123');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://registry.a2a.io/agents/agent-123',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
        },
      })
    );
    expect(agentCard.name).toBe('Test Agent');
  });
});

describe('EnterpriseAgentRegistry', () => {
  let registry: EnterpriseAgentRegistry;

  beforeEach(() => {
    registry = new EnterpriseAgentRegistry(
      'https://enterprise.example.com/registry',
      'api-key-123'
    );
    vi.clearAllMocks();
  });

  it('should search with authentication', async () => {
    const mockResults = {
      agents: [
        {
          id: 'enterprise-agent-1',
          name: 'Enterprise Agent',
          description: 'Internal enterprise agent',
          version: '1.0.0',
        },
      ],
    };

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResults,
    } as Response);

    const results = await registry.searchAgents('enterprise');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://enterprise.example.com/registry/search?q=enterprise',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer api-key-123',
        },
      })
    );
    expect(results).toHaveLength(1);
  });

  it('should get agent card with authentication', async () => {
    const mockAgentCard: AgentCard = getMockAgentCard({
      name: 'Enterprise Agent',
      description: 'Internal agent',
      version: '1.0.0',
      url: 'https://api.enterprise.com',
    });

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockAgentCard,
    } as Response);

    const agentCard = await registry.getAgentCard('enterprise-123');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://enterprise.example.com/registry/agents/enterprise-123',
      expect.objectContaining({
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer api-key-123',
        },
      })
    );
  });

  it('should handle authentication errors', async () => {
    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    } as Response);

    await expect(registry.searchAgents('test')).rejects.toThrow(
      'Failed to search agents: 401 Unauthorized'
    );
  });
});
