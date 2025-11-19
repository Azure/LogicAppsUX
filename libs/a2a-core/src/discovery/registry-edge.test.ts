import { describe, it, expect, vi } from 'vitest';
import { PublicAgentRegistry, EnterpriseAgentRegistry } from './registry';

// Mock fetch globally
global.fetch = vi.fn();

describe('Registry edge cases', () => {
  describe('PublicAgentRegistry', () => {
    it('should handle empty search results', async () => {
      const registry = new PublicAgentRegistry('https://registry.test.com');

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // No agents field
      } as Response);

      const results = await registry.searchAgents('test');

      expect(results).toEqual([]);
    });

    it('should handle search errors', async () => {
      const registry = new PublicAgentRegistry('https://registry.test.com');

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      await expect(registry.searchAgents('test')).rejects.toThrow(
        'Failed to search agents: 500 Internal Server Error'
      );
    });

    it('should validate agent card from registry', async () => {
      const registry = new PublicAgentRegistry('https://registry.test.com');

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'Invalid Agent',
          // Missing required fields
        }),
      } as Response);

      await expect(registry.getAgentCard('invalid-agent')).rejects.toThrow(
        'Invalid agent card from registry'
      );
    });
  });

  describe('EnterpriseAgentRegistry', () => {
    it('should handle empty search results', async () => {
      const registry = new EnterpriseAgentRegistry('https://enterprise.test.com', 'key');

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ agents: null }), // Null agents
      } as Response);

      const results = await registry.searchAgents('test');

      expect(results).toEqual([]);
    });

    it('should handle get agent card errors', async () => {
      const registry = new EnterpriseAgentRegistry('https://enterprise.test.com', 'key');

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
      } as Response);

      await expect(registry.getAgentCard('agent-123')).rejects.toThrow(
        'Failed to get agent card: 403 Forbidden'
      );
    });
  });
});
