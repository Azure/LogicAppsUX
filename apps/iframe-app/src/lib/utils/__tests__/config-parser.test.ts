import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseIframeConfig } from '../config-parser';

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

      expect(config.props.agentCard).toBe(
        'https://example.com/api/agents/TestAgent/.well-known/agent-card.json'
      );
    });

    it('handles case-insensitive URL pattern matching', () => {
      window.location.href = 'https://example.com/api/agentschat/MyAgent/iframe';

      const config = parseIframeConfig();

      expect(config.props.agentCard).toBe(
        'https://example.com/api/agents/MyAgent/.well-known/agent-card.json'
      );
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

      expect(() => parseIframeConfig()).toThrow(
        "The origin 'evil.com' is not trusted for Frame Blade"
      );
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
