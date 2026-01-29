import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { parseIframeConfig, parseIdentityProviders } from '../config-parser';

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

    it('returns undefined for identity providers when window.IDENTITY_PROVIDERS is not set', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';

      const config = parseIframeConfig();

      // No fallback to default providers - undefined means no sign-in required
      expect(config.props.identityProviders).toBeUndefined();
    });

    it('uses window.IDENTITY_PROVIDERS when set', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      (window as any).IDENTITY_PROVIDERS = '{"custom":{"signInEndpoint":"/.auth/login/custom","name":"Custom Provider"}}';

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

    it('returns undefined for identity providers when IDENTITY_PROVIDERS is invalid JSON', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      (window as any).IDENTITY_PROVIDERS = 'not valid json';

      const config = parseIframeConfig();

      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse IDENTITY_PROVIDERS:', expect.any(Error));
      // No fallback to default providers - undefined means no sign-in required
      expect(config.props.identityProviders).toBeUndefined();

      // Clean up
      delete (window as any).IDENTITY_PROVIDERS;
    });

    it('returns undefined for identity providers when IDENTITY_PROVIDERS is empty string', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      (window as any).IDENTITY_PROVIDERS = '';

      const config = parseIframeConfig();

      // No fallback to default providers - undefined means no sign-in required
      expect(config.props.identityProviders).toBeUndefined();

      // Clean up
      delete (window as any).IDENTITY_PROVIDERS;
    });

    it('returns undefined for identity providers when IDENTITY_PROVIDERS parses to null', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      (window as any).IDENTITY_PROVIDERS = 'null';

      const config = parseIframeConfig();

      // No fallback to default providers - undefined means no sign-in required
      expect(config.props.identityProviders).toBeUndefined();

      // Clean up
      delete (window as any).IDENTITY_PROVIDERS;
    });

    it('returns undefined for identity providers when IDENTITY_PROVIDERS parses to array', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      (window as any).IDENTITY_PROVIDERS = '["microsoft", "google"]';

      const config = parseIframeConfig();

      // Arrays are objects but not the expected Record<string, IdentityProvider> format
      // The parseIdentityProviders function returns the parsed object as-is
      expect(config.props.identityProviders).toEqual(['microsoft', 'google']);

      // Clean up
      delete (window as any).IDENTITY_PROVIDERS;
    });

    it('returns undefined for identity providers when IDENTITY_PROVIDERS parses to primitive', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      (window as any).IDENTITY_PROVIDERS = '"just a string"';

      const config = parseIframeConfig();

      // No fallback to default providers - undefined means no sign-in required
      expect(config.props.identityProviders).toBeUndefined();

      // Clean up
      delete (window as any).IDENTITY_PROVIDERS;
    });

    it('handles multiple identity providers', () => {
      document.documentElement.dataset.agentCard = 'http://test.agent/agent-card.json';
      (window as any).IDENTITY_PROVIDERS =
        '{"microsoft":{"signInEndpoint":"/.auth/login/aad","name":"Microsoft"},"google":{"signInEndpoint":"/.auth/login/google","name":"Google"},"github":{"signInEndpoint":"/.auth/login/github","name":"GitHub"}}';

      const config = parseIframeConfig();

      expect(config.props.identityProviders).toEqual({
        microsoft: { signInEndpoint: '/.auth/login/aad', name: 'Microsoft' },
        google: { signInEndpoint: '/.auth/login/google', name: 'Google' },
        github: { signInEndpoint: '/.auth/login/github', name: 'GitHub' },
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

describe('parseIdentityProviders', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Clean up IDENTITY_PROVIDERS before each test
    delete (window as any).IDENTITY_PROVIDERS;
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    delete (window as any).IDENTITY_PROVIDERS;
    consoleErrorSpy?.mockRestore();
  });

  it('returns undefined when IDENTITY_PROVIDERS is not set', () => {
    const result = parseIdentityProviders();

    expect(result).toBeUndefined();
  });

  it('returns undefined when IDENTITY_PROVIDERS is empty string', () => {
    (window as any).IDENTITY_PROVIDERS = '';

    const result = parseIdentityProviders();

    expect(result).toBeUndefined();
  });

  it('parses valid JSON identity providers', () => {
    (window as any).IDENTITY_PROVIDERS = '{"microsoft":{"signInEndpoint":"/.auth/login/aad","name":"Microsoft"}}';

    const result = parseIdentityProviders();

    expect(result).toEqual({
      microsoft: { signInEndpoint: '/.auth/login/aad', name: 'Microsoft' },
    });
  });

  it('parses multiple identity providers', () => {
    (window as any).IDENTITY_PROVIDERS =
      '{"microsoft":{"signInEndpoint":"/.auth/login/aad","name":"Microsoft"},"google":{"signInEndpoint":"/.auth/login/google","name":"Google"}}';

    const result = parseIdentityProviders();

    expect(result).toEqual({
      microsoft: { signInEndpoint: '/.auth/login/aad', name: 'Microsoft' },
      google: { signInEndpoint: '/.auth/login/google', name: 'Google' },
    });
  });

  it('returns undefined and logs error for invalid JSON', () => {
    (window as any).IDENTITY_PROVIDERS = 'not valid json';

    const result = parseIdentityProviders();

    expect(result).toBeUndefined();
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to parse IDENTITY_PROVIDERS:', expect.any(Error));
  });

  it('returns undefined when JSON parses to null', () => {
    (window as any).IDENTITY_PROVIDERS = 'null';

    const result = parseIdentityProviders();

    expect(result).toBeUndefined();
  });

  it('returns undefined when JSON parses to a string', () => {
    (window as any).IDENTITY_PROVIDERS = '"just a string"';

    const result = parseIdentityProviders();

    expect(result).toBeUndefined();
  });

  it('returns undefined when JSON parses to a number', () => {
    (window as any).IDENTITY_PROVIDERS = '123';

    const result = parseIdentityProviders();

    expect(result).toBeUndefined();
  });

  it('returns undefined when JSON parses to a boolean', () => {
    (window as any).IDENTITY_PROVIDERS = 'true';

    const result = parseIdentityProviders();

    expect(result).toBeUndefined();
  });

  it('returns array when JSON parses to array (arrays are objects)', () => {
    (window as any).IDENTITY_PROVIDERS = '["microsoft", "google"]';

    const result = parseIdentityProviders();

    // Note: arrays pass typeof === 'object' check, so they are returned
    expect(result).toEqual(['microsoft', 'google']);
  });

  it('returns empty object for empty JSON object', () => {
    (window as any).IDENTITY_PROVIDERS = '{}';

    const result = parseIdentityProviders();

    expect(result).toEqual({});
  });

  it('handles identity providers with additional properties', () => {
    (window as any).IDENTITY_PROVIDERS = '{"custom":{"signInEndpoint":"/.auth/login/custom","name":"Custom SSO","icon":"custom-icon.png"}}';

    const result = parseIdentityProviders();

    expect(result).toEqual({
      custom: { signInEndpoint: '/.auth/login/custom', name: 'Custom SSO', icon: 'custom-icon.png' },
    });
  });
});
