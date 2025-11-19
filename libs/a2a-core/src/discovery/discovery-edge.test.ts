import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentDiscovery } from './agent-discovery';
import { getMockAgentCard } from '../test-utils/mock-agent-card';

// Mock fetch globally
global.fetch = vi.fn();

describe('AgentDiscovery edge cases', () => {
  let discovery: AgentDiscovery;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('caching behavior', () => {
    it('should respect cache disabled option', async () => {
      discovery = new AgentDiscovery({ cache: false });

      const mockAgentCard = getMockAgentCard({
        url: 'https://api.test.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      // First call
      await discovery.fromWellKnownUri('test.com');

      // Second call should fetch again since cache is disabled
      await discovery.fromWellKnownUri('test.com');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(discovery.getCached('https://test.com/.well-known/agent-card.json')).toBeNull();
    });

    it('should handle expired cache entries', async () => {
      // Create discovery with very short TTL
      discovery = new AgentDiscovery({ cacheTTL: 100 });

      const mockAgentCard = getMockAgentCard({
        url: 'https://api.test.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      // First call
      await discovery.fromWellKnownUri('test.com');

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should return null for expired cache
      expect(discovery.getCached('https://test.com/.well-known/agent-card.json')).toBeNull();

      // Second call should fetch again
      await discovery.fromWellKnownUri('test.com');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
