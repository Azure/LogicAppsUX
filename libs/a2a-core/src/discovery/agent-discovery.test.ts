import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AgentDiscovery } from './agent-discovery';
import type { AgentCard } from '../types';
import { getMockAgentCard } from '../test-utils/mock-agent-card';

// Mock fetch globally
global.fetch = vi.fn();

describe('AgentDiscovery', () => {
  let discovery: AgentDiscovery;

  beforeEach(() => {
    discovery = new AgentDiscovery();
    vi.clearAllMocks();
  });

  describe('fromWellKnownUri', () => {
    it('should fetch agent card from well-known URI', async () => {
      const mockAgentCard = getMockAgentCard({
        name: 'Test Agent',
        description: 'A test agent',
        version: '1.0.0',
        url: 'https://api.agent.example.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      const result = await discovery.fromWellKnownUri('agent.example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://agent.example.com/.well-known/agent-card.json',
        {
          headers: {},
        }
      );
      expect(result).toEqual(mockAgentCard);
    });

    it('should handle domain with protocol', async () => {
      const mockAgentCard = getMockAgentCard({
        name: 'Test Agent',
        description: 'A test agent',
        version: '1.0.0',
        url: 'https://api.agent.example.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      await discovery.fromWellKnownUri('https://agent.example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://agent.example.com/.well-known/agent-card.json',
        {
          headers: {},
        }
      );
    });

    it('should include API key header when provided', async () => {
      const mockAgentCard = getMockAgentCard({
        name: 'Test Agent',
        description: 'A test agent',
        version: '1.0.0',
        url: 'https://api.agent.example.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      discovery = new AgentDiscovery({ apiKey: 'test-api-key-123' });
      const result = await discovery.fromWellKnownUri('agent.example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://agent.example.com/.well-known/agent-card.json',
        {
          headers: { 'X-API-Key': 'test-api-key-123' },
        }
      );
      expect(result).toEqual(mockAgentCard);
    });

    it('should throw error for failed fetch', async () => {
      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      await expect(discovery.fromWellKnownUri('agent.example.com')).rejects.toThrow(
        'Failed to fetch agent card'
      );
    });

    it('should validate agent card schema', async () => {
      const invalidAgentCard = {
        name: 'Invalid Agent',
        // Missing required fields
      };

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => invalidAgentCard,
      } as Response);

      await expect(discovery.fromWellKnownUri('agent.example.com')).rejects.toThrow(
        'Invalid agent card'
      );
    });
  });

  describe('fromRegistry', () => {
    it('should fetch agent card from registry', async () => {
      const mockAgentCard = getMockAgentCard({
        name: 'Registry Agent',
        description: 'An agent from registry',
        version: '2.0.0',
        url: 'https://api.registry-agent.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      const result = await discovery.fromRegistry('https://registry.example.com', 'agent-123');

      expect(mockFetch).toHaveBeenCalledWith('https://registry.example.com/agents/agent-123', {
        headers: {},
      });
      expect(result).toEqual(mockAgentCard);
    });

    it('should handle registry URL with trailing slash', async () => {
      const mockAgentCard = getMockAgentCard({
        name: 'Registry Agent',
        description: 'An agent from registry',
        version: '2.0.0',
        url: 'https://api.registry-agent.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      await discovery.fromRegistry('https://registry.example.com/', 'agent-123');

      expect(mockFetch).toHaveBeenCalledWith('https://registry.example.com/agents/agent-123', {
        headers: {},
      });
    });
  });

  describe('fromDirect', () => {
    it('should accept inline agent card object', async () => {
      const agentCard = getMockAgentCard({
        name: 'Direct Agent',
        description: 'A directly provided agent',
        version: '1.0.0',
        url: 'https://api.direct-agent.com',
      });

      const result = await discovery.fromDirect(agentCard);

      expect(result).toEqual(agentCard);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should fetch agent card from URL', async () => {
      const mockAgentCard = getMockAgentCard({
        name: 'URL Agent',
        description: 'An agent from URL',
        version: '1.0.0',
        url: 'https://api.url-agent.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      const result = await discovery.fromDirect('https://example.com/agent-card.json');

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/agent-card.json', {
        headers: {},
      });
      expect(result).toEqual(mockAgentCard);
    });

    it('should validate inline agent card', async () => {
      const invalidCard = {
        name: 'Invalid',
        // Missing required fields
      };

      await expect(discovery.fromDirect(invalidCard as AgentCard)).rejects.toThrow(
        'Invalid agent card'
      );
    });
  });

  // Helper methods tests removed as these methods no longer exist

  describe('caching', () => {
    it('should cache fetched agent cards', async () => {
      const mockAgentCard = getMockAgentCard({
        name: 'Cached Agent',
        description: 'Test caching',
        version: '1.0.0',
        url: 'https://api.cached.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      // First call
      await discovery.fromWellKnownUri('cached.example.com');

      // Check cache
      const cached = discovery.getCached('https://cached.example.com/.well-known/agent-card.json');
      expect(cached).toEqual(mockAgentCard);

      // Second call should use cache
      await discovery.fromWellKnownUri('cached.example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should clear cache', async () => {
      const mockAgentCard = getMockAgentCard({
        name: 'Test',
        description: 'Test',
        version: '1.0.0',
        url: 'https://api.test.com',
      });

      const mockFetch = vi.mocked(fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockAgentCard,
      } as Response);

      await discovery.fromWellKnownUri('test.com');
      expect(discovery.getCached('https://test.com/.well-known/agent-card.json')).toBeTruthy();

      discovery.clearCache();
      expect(discovery.getCached('https://test.com/.well-known/agent-card.json')).toBeNull();
    });
  });
});
