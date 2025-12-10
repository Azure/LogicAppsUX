import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getAgentBaseUrl, parseIframeConfig } from '../config-parser';

describe('parseIframeConfig', () => {
  let originalLocation: Location;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Save original location
    originalLocation = window.location;

    // Mock window.location
    delete (window as any).location;
    (window as any).location = {
      href: 'http://localhost',
      search: '',
    };

    // Clear dataset
    Object.keys(document.documentElement.dataset).forEach((key) => {
      delete document.documentElement.dataset[key];
    });

    // Mock console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original location
    (window as any).location = originalLocation;

    // Clear dataset
    Object.keys(document.documentElement.dataset).forEach((key) => {
      delete document.documentElement.dataset[key];
    });

    // Restore console.error
    consoleErrorSpy?.mockRestore();
  });

  describe('agent URL extraction', () => {
    it('extracts agent URL from data attribute', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('http://test.agent/agent-card.json');
    });

    it('extracts agent URL from URL parameter', () => {
      window.location.search = '?agentCard=http://url.agent/agent-card.json';

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('http://url.agent/agent-card.json');
    });

    it('supports legacy agent parameter', () => {
      window.location.search = '?agent=http://legacy.agent/agent-card.json';

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('http://legacy.agent/agent-card.json');
    });

    it('prefers data attribute over URL parameter', () => {
      document.documentElement.dataset.agentCard = 'http://data.agent/agent-card.json';
      window.location.search = '?agentCard=http://url.agent/agent-card.json';

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('http://data.agent/agent-card.json');
    });

    it('transforms URL to agent card when following iframe pattern', () => {
      window.location.href = 'https://example.com/api/agentsChat/TestAgent/IFrame';

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('https://example.com/api/agents/TestAgent/.well-known/agent-card.json');
    });

    it('handles case-insensitive URL pattern matching', () => {
      window.location.href = 'https://example.com/api/agentschat/MyAgent/iframe';

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe('https://example.com/api/agents/MyAgent/.well-known/agent-card.json');
    });

    it('throws error when agent URL is missing and URL pattern does not match', () => {
      window.location.href = 'https://example.com/some/other/path';

      expect(() => parseIframeConfig()).toThrow(
        `data-agent-card is required or URL must follow below pattern:
 1. /api/agentsChat/{AgentKind}/IFrame for a standard app
 2. /scaleunits/{ScaleUnitId}/flows/{FlowId}/agentChat/IFrame for a consumption app`
      );
    });
  });

  describe('theme parsing', () => {
    it('parses theme from data attributes', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      document.documentElement.dataset.themePrimary = '#ff0000';
      document.documentElement.dataset.themeBackground = '#ffffff';

      const config = parseIframeConfig();

      expect(config.props.theme?.colors).toEqual({
        primary: '#ff0000',
        primaryText: '#fff',
        background: '#ffffff',
        surface: '#fff',
        text: '#222',
        textSecondary: '#666',
        border: '#e0e0e0',
        error: '#d32f2f',
        success: '#388e3c',
      });
    });

    it('uses theme preset', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      window.location.search = '?theme=azure';

      const config = parseIframeConfig();

      expect(config.props.theme?.colors?.primary).toBe('#0078d4');
    });
  });

  describe('branding parsing', () => {
    it('parses branding from data attributes', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      document.documentElement.dataset.brandTitle = 'My Chat';
      document.documentElement.dataset.brandSubtitle = 'AI Assistant';
      document.documentElement.dataset.brandLogoUrl = 'http://example.com/logo.png';

      const config = parseIframeConfig();

      expect(config.props.theme?.branding).toEqual({
        name: 'My Chat',
        logoUrl: 'http://example.com/logo.png',
      });
      expect(config.props.welcomeMessage).toBe('AI Assistant');
    });

    it('uses default branding values when not specified', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';

      const config = parseIframeConfig();

      expect(config.props.theme?.branding).toBeUndefined();
      expect(config.props.welcomeMessage).toBeUndefined();
    });
  });

  describe('other configuration', () => {
    it('parses user ID from data attributes', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      document.documentElement.dataset.userId = 'user123';

      const config = parseIframeConfig();

      expect(config.props.userId).toBe('user123');
    });

    it('parses valid metadata JSON', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      document.documentElement.dataset.metadata = '{"key":"value","num":123}';

      const config = parseIframeConfig();

      expect(config.props.metadata).toEqual({ key: 'value', num: 123 });
    });

    it('handles invalid metadata JSON gracefully', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      document.documentElement.dataset.metadata = 'invalid json';

      const config = parseIframeConfig();

      expect(config.props.metadata).toBeUndefined();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse metadata:', expect.any(Error));
    });

    it('parses allowed file types', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      document.documentElement.dataset.allowedFileTypes = '.pdf,.doc,.txt';

      const config = parseIframeConfig();

      expect(config.props.allowedFileTypes).toEqual(['.pdf', '.doc', '.txt']);
    });

    it('handles allowFileUpload as true by default', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';

      const config = parseIframeConfig();

      expect(config.props.allowFileUpload).toBe(true);
    });

    it('parses multi-session mode', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      window.location.search = '?multiSession=true';

      const config = parseIframeConfig();

      expect(config.multiSession).toBe(true);
    });

    it('parses context ID from URL parameter', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      window.location.search = '?contextId=ctx-123';

      const config = parseIframeConfig();

      expect(config.contextId).toBe('ctx-123');
    });

    it('includes default identity providers when window.IDENTITY_PROVIDERS is not set', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';

      const config = parseIframeConfig();

      expect(config.props.identityProviders).toBeDefined();
      expect(config.props.identityProviders?.microsoft).toEqual({
        signInEndpoint: '/.auth/login/aad',
        name: 'Microsoft',
      });
    });

    it('uses window.IDENTITY_PROVIDERS when set', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      (window as any).IDENTITY_PROVIDERS = {
        custom: {
          signInEndpoint: '/.auth/login/custom',
          name: 'Custom Provider',
        },
      };

      const config = parseIframeConfig();

      expect(config.props.identityProviders).toEqual({
        custom: {
          signInEndpoint: '/.auth/login/custom',
          name: 'Custom Provider',
        },
      });

      // Clean up
      delete (window as any).IDENTITY_PROVIDERS;
    });
  });

  describe('portal security', () => {
    it('validates trusted portal authority', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      window.location.search = '?inPortal=true&trustedAuthority=https://portal.azure.com';

      const config = parseIframeConfig();

      expect(config.inPortal).toBe(true);
      expect(config.trustedParentOrigin).toBe('https://portal.azure.com');
    });

    it('allows subdomain of trusted authority', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      window.location.search = '?inPortal=true&trustedAuthority=https://subdomain.portal.azure.com';

      const config = parseIframeConfig();

      expect(config.inPortal).toBe(true);
      expect(config.trustedParentOrigin).toBe('https://subdomain.portal.azure.com');
    });

    it('throws error for untrusted authority', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      window.location.search = '?inPortal=true&trustedAuthority=https://evil.com';

      expect(() => parseIframeConfig()).toThrow("The origin 'evil.com' is not trusted for Frame Blade");
    });

    it('allows localhost for development', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      window.location.search = '?inPortal=true&trustedAuthority=https://localhost:3000';

      const config = parseIframeConfig();

      expect(config.inPortal).toBe(true);
      expect(config.trustedParentOrigin).toBe('https://localhost:3000');
    });
  });
});

describe('getAgentBaseUrl', () => {
  it('removes agent card suffix from URL', () => {
    const url = 'https://example.com/api/agents/TestAgent/.well-known/agent-card.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/TestAgent');
  });

  it('returns URL unchanged if no agent card suffix', () => {
    const url = 'https://example.com/api/agents/TestAgent';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/TestAgent');
  });

  it('returns empty string for undefined URL', () => {
    const result = getAgentBaseUrl(undefined);

    expect(result).toBe('');
  });

  it('handles URLs with query parameters after agent card suffix', () => {
    const url = 'https://example.com/api/agents/TestAgent/.well-known/agent-card.json?param=value';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/TestAgent?param=value');
  });

  it('handles URLs with hash fragments', () => {
    const url = 'https://example.com/api/agents/TestAgent/.well-known/agent-card.json#section';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/TestAgent#section');
  });

  it('handles URLs with both query parameters and hash fragments', () => {
    const url = 'https://example.com/api/agents/TestAgent/.well-known/agent-card.json?param=value#section';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/TestAgent?param=value#section');
  });

  it('handles URLs with port numbers', () => {
    const url = 'https://example.com:8080/api/agents/TestAgent/.well-known/agent-card.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com:8080/api/agents/TestAgent');
  });

  it('handles URLs with special characters in agent name', () => {
    const url = 'https://example.com/api/agents/Test-Agent_v2.0/.well-known/agent-card.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/Test-Agent_v2.0');
  });

  it('handles URLs with encoded characters', () => {
    const url = 'https://example.com/api/agents/Test%20Agent/.well-known/agent-card.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/Test%20Agent');
  });

  it('handles URLs with multiple path segments after agent', () => {
    const url = 'https://example.com/api/v2/agents/TestAgent/.well-known/agent-card.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/v2/agents/TestAgent');
  });

  it('handles protocol-relative URLs', () => {
    const url = '//example.com/api/agents/TestAgent/.well-known/agent-card.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('//example.com/api/agents/TestAgent');
  });

  it('handles relative URLs', () => {
    const url = '/api/agents/TestAgent/.well-known/agent-card.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('/api/agents/TestAgent');
  });

  it('only removes the exact suffix pattern', () => {
    const url = 'https://example.com/api/agents/TestAgent/.well-known/other-file.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/TestAgent/.well-known/other-file.json');
  });

  it('handles empty string', () => {
    const result = getAgentBaseUrl('');

    expect(result).toBe('');
  });

  it('handles URLs with trailing slashes before suffix', () => {
    const url = 'https://example.com/api/agents/TestAgent//.well-known/agent-card.json';
    const result = getAgentBaseUrl(url);

    expect(result).toBe('https://example.com/api/agents/TestAgent/');
  });
});
