import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseIframeConfig, parseIdentityProviders } from '../config-parser';

describe('config-parser', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Reset dataset
    Object.keys(document.documentElement.dataset).forEach((key) => {
      delete document.documentElement.dataset[key];
    });
  });

  afterEach(() => {
    // Restore location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
    });
  });

  const mockLocation = (url: string) => {
    const urlObj = new URL(url);
    Object.defineProperty(window, 'location', {
      value: {
        href: url,
        search: urlObj.search,
        host: urlObj.host,
        protocol: urlObj.protocol,
      },
      writable: true,
    });
  };

  describe('API key parsing', () => {
    it('should parse apiKey with camelCase from URL', () => {
      mockLocation('https://example.com/api/agentsChat/testAgent/IFrame?apiKey=test-key-123');

      const config = parseIframeConfig();

      expect(config.apiKey).toBe('test-key-123');
      expect(config.props.apiKey).toBe('test-key-123');
    });

    it('should parse apikey with lowercase from URL', () => {
      mockLocation('https://example.com/api/agentsChat/testAgent/IFrame?apikey=test-key-lowercase');

      const config = parseIframeConfig();

      expect(config.apiKey).toBe('test-key-lowercase');
      expect(config.props.apiKey).toBe('test-key-lowercase');
    });

    it('should prefer camelCase apiKey over lowercase apikey', () => {
      mockLocation('https://example.com/api/agentsChat/testAgent/IFrame?apiKey=camel-key&apikey=lower-key');

      const config = parseIframeConfig();

      expect(config.apiKey).toBe('camel-key');
    });

    it('should fall back to dataset.apiKey when URL params are not present', () => {
      mockLocation('https://example.com/api/agentsChat/testAgent/IFrame');
      document.documentElement.dataset.apiKey = 'dataset-key';

      const config = parseIframeConfig();

      expect(config.apiKey).toBe('dataset-key');
    });

    it('should prefer URL apiKey over dataset.apiKey', () => {
      mockLocation('https://example.com/api/agentsChat/testAgent/IFrame?apiKey=url-key');
      document.documentElement.dataset.apiKey = 'dataset-key';

      const config = parseIframeConfig();

      expect(config.apiKey).toBe('url-key');
    });

    it('should return undefined when no apiKey is provided', () => {
      mockLocation('https://example.com/api/agentsChat/testAgent/IFrame');

      const config = parseIframeConfig();

      expect(config.apiKey).toBeUndefined();
    });
  });

  describe('agent card URL extraction', () => {
    it('should extract agent card URL from standard iframe pattern', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame');

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('https://example.com/api/agents/myAgent/.well-known/agent-card.json');
    });

    it('should handle case-insensitive iframe pattern', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/iframe');

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('https://example.com/api/agents/myAgent/.well-known/agent-card.json');
    });

    it('should use agentCard param when provided', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame?agentCard=https://custom.com/agent-card.json');

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('https://custom.com/agent-card.json');
    });
  });

  describe('portal mode', () => {
    it('should set inPortal to true when param is present', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame?inPortal=true');

      const config = parseIframeConfig();

      expect(config.inPortal).toBe(true);
    });

    it('should set inPortal to false when param is not present', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame');

      const config = parseIframeConfig();

      expect(config.inPortal).toBe(false);
    });

    it('should validate trusted authority for portal mode', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame?inPortal=true&trustedAuthority=https://portal.azure.com');

      const config = parseIframeConfig();

      expect(config.trustedParentOrigin).toBe('https://portal.azure.com');
    });

    it('should throw error for untrusted authority in portal mode', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame?inPortal=true&trustedAuthority=https://malicious.com');

      expect(() => parseIframeConfig()).toThrow("The origin 'malicious.com' is not trusted for Frame Blade.");
    });
  });

  describe('session mode', () => {
    it('should default to multi-session mode', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame');

      const config = parseIframeConfig();

      expect(config.multiSession).toBe(true);
    });

    it('should set single-session mode when param is true', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame?singleSession=true');

      const config = parseIframeConfig();

      expect(config.multiSession).toBe(false);
    });
  });

  describe('theme mode', () => {
    it('should default to light mode', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame');

      const config = parseIframeConfig();

      expect(config.mode).toBe('light');
    });

    it('should set dark mode when param is dark', () => {
      mockLocation('https://example.com/api/agentsChat/myAgent/IFrame?mode=dark');

      const config = parseIframeConfig();

      expect(config.mode).toBe('dark');
    });
  });

  describe('parseIdentityProviders', () => {
    afterEach(() => {
      delete window.IDENTITY_PROVIDERS;
    });

    it('should return undefined when IDENTITY_PROVIDERS is not set', () => {
      const result = parseIdentityProviders();

      expect(result).toBeUndefined();
    });

    it('should parse valid JSON identity providers', () => {
      window.IDENTITY_PROVIDERS = JSON.stringify({
        microsoft: { signInEndpoint: '/.auth/login/aad', name: 'Microsoft' },
      });

      const result = parseIdentityProviders();

      expect(result).toEqual({
        microsoft: { signInEndpoint: '/.auth/login/aad', name: 'Microsoft' },
      });
    });

    it('should return undefined for invalid JSON', () => {
      window.IDENTITY_PROVIDERS = 'invalid-json';
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = parseIdentityProviders();

      expect(result).toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
