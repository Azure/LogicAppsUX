import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentDiscovery } from './agent-discovery';
import type { AgentCard } from '../types';
import { getMockAgentCard } from '../test-utils/mock-agent-card';

// Mock fetch globally
global.fetch = vi.fn();

describe('AgentDiscovery caching edge cases', () => {
  let discovery: AgentDiscovery;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not cache fromDirect with inline agent card', async () => {
    discovery = new AgentDiscovery();

    const agentCard = getMockAgentCard({
      name: 'Inline Agent',
      description: 'Test',
      version: '1.0.0',
      url: 'https://api.test.com',
    });

    // Pass inline card multiple times
    await discovery.fromDirect(agentCard);
    await discovery.fromDirect(agentCard);

    // Should not make any fetch calls
    expect(fetch).not.toHaveBeenCalled();
  });

  it('should cache fromRegistry results', async () => {
    discovery = new AgentDiscovery();

    const mockAgentCard = getMockAgentCard({
      name: 'Registry Agent',
      description: 'Test',
      version: '1.0.0',
      url: 'https://api.test.com',
    });

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAgentCard,
    } as Response);

    // First call
    await discovery.fromRegistry('https://registry.test.com', 'agent-123');

    // Second call should use cache
    await discovery.fromRegistry('https://registry.test.com', 'agent-123');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('should cache fromDirect with URL', async () => {
    discovery = new AgentDiscovery();

    const mockAgentCard = getMockAgentCard({
      name: 'URL Agent',
      description: 'Test',
      version: '1.0.0',
      url: 'https://api.test.com',
    });

    const mockFetch = vi.mocked(fetch);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAgentCard,
    } as Response);

    // First call
    await discovery.fromDirect('https://example.com/agent-card.json');

    // Second call should use cache
    await discovery.fromDirect('https://example.com/agent-card.json');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
