import type { ChatWidgetProps, ChatTheme, IdentityProvider } from '@microsoft/logic-apps-chat';
import { THEME_PRESETS } from './theme-presets';

export interface IframeConfig {
  props: ChatWidgetProps;
  multiSession: boolean;
  apiKey?: string;
  oboUserToken?: string;
  mode?: 'light' | 'dark';
  inPortal?: boolean;
  trustedParentOrigin?: string;
  contextId?: string;
}

interface PortalValidationResult {
  trustedParentOrigin?: string;
}

const ALLOWED_PORTAL_AUTHORITIES = ['df.onecloud.azure-test.net', 'portal.azure.com', 'ms.portal.azure.com', 'rc.portal.azure.com'];

function isIframeRunningLocally(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

function isLocalhostHostname(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function validatePortalSecurity(params: URLSearchParams): PortalValidationResult {
  const trustedAuthority = params.get('trustedAuthority') || '';
  if (!trustedAuthority) {
    return {};
  }

  // Canonicalize the query-supplied authority so downstream trust decisions operate on a
  // parsed origin instead of raw, attacker-controllable text.
  let parsedAuthority: URL;
  try {
    parsedAuthority = new URL(trustedAuthority);
  } catch {
    throw new Error(`The origin '${trustedAuthority}' is not trusted for Frame Blade.`);
  }

  const parentHost = parsedAuthority.host.toLowerCase();
  const parentHostname = parsedAuthority.hostname.toLowerCase();

  // Localhost parents are only honored when the iframe itself is running locally, so a
  // production iframe can never be embedded and driven by a localhost origin.
  if (isLocalhostHostname(parentHostname)) {
    if (!isIframeRunningLocally() || (parsedAuthority.protocol !== 'http:' && parsedAuthority.protocol !== 'https:')) {
      throw new Error(`The origin '${parentHost}' is not trusted for Frame Blade.`);
    }
    return { trustedParentOrigin: parsedAuthority.origin };
  }

  // Non-localhost portal hosts must use HTTPS; any other scheme is rejected.
  if (parsedAuthority.protocol !== 'https:') {
    throw new Error(`The origin '${parentHost}' is not trusted for Frame Blade.`);
  }

  const isTrustedOrigin = ALLOWED_PORTAL_AUTHORITIES.some((allowedOrigin) => {
    if (allowedOrigin === parentHost) {
      return true;
    }
    const subdomainSuffix = `.${allowedOrigin}`;
    return parentHost.length > subdomainSuffix.length && parentHost.slice(-subdomainSuffix.length) === subdomainSuffix;
  });

  if (!isTrustedOrigin) {
    throw new Error(`The origin '${parentHost}' is not trusted for Frame Blade.`);
  }

  return { trustedParentOrigin: parsedAuthority.origin };
}

const ALLOWED_AGENT_CARD_DOMAINS = ['.logic.azure.com', '.logic-apps.azure.com'];

export type AgentCardPayload = ChatWidgetProps['agentCard'];

function isAgentCardObject(value: unknown): value is Exclude<AgentCardPayload, string> {
  return typeof value === 'object' && value !== null && 'url' in value && typeof value.url === 'string';
}

/**
 * Validates that an agent card URL uses HTTPS and points to a trusted Microsoft domain.
 * Blocks arbitrary external URLs to prevent chat hijacking via agentCard parameter injection.
 */
export function validateAgentCardUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid agent card URL: ${url}`);
  }

  // Allow localhost only when the iframe itself is running locally (development)
  const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    if (isLocalDevelopment && (parsed.protocol === 'http:' || parsed.protocol === 'https:')) {
      return url;
    }
    throw new Error('Agent card URLs pointing to localhost are only allowed during local development.');
  }

  if (parsed.protocol !== 'https:') {
    throw new Error(`Agent card URL must use HTTPS protocol, got: ${parsed.protocol}`);
  }

  const isTrustedDomain = ALLOWED_AGENT_CARD_DOMAINS.some(
    (domain) => parsed.hostname === domain.slice(1) || parsed.hostname.endsWith(domain)
  );

  if (!isTrustedDomain) {
    throw new Error(`Agent card URL domain is not trusted: ${parsed.hostname}. Allowed domains: ${ALLOWED_AGENT_CARD_DOMAINS.join(', ')}`);
  }

  return url;
}

/**
 * Validates the URL carried by either supported agent-card payload shape.
 * The original payload is returned so object-based agent cards retain their metadata.
 */
export function validateAgentCardPayload(agentCard: unknown): AgentCardPayload {
  if (typeof agentCard === 'string') {
    validateAgentCardUrl(agentCard);
    return agentCard;
  }

  if (isAgentCardObject(agentCard)) {
    validateAgentCardUrl(agentCard.url);
    return agentCard;
  }

  throw new Error('Agent card must be a URL string or an object with a URL string.');
}

function extractAgentCardUrl(params: URLSearchParams, dataset: DOMStringMap): string {
  // Support both 'agent' and 'agentCard' parameters
  const agentCard = dataset.agentCard || params.get('agentCard') || params.get('agent');

  if (agentCard) {
    return validateAgentCardUrl(agentCard);
  }

  // Transform current URL to agent card URL if we're in an iframe context
  const currentUrl = window.location.href;
  const currentHost = window.location.host;
  const standardIframePattern = /\/api\/agentsChat\/([^/]+)\/IFrame/i;
  const consumptionFramePattern = /\/scaleunits\/([^/]+)\/flows\/([^/]+)\/agentchat\/IFrame/i;

  const standardMatch = currentUrl.match(standardIframePattern);
  const consumptionMatch = currentUrl.match(consumptionFramePattern);

  if (standardMatch && standardMatch[1]) {
    const agentKind = standardMatch[1];
    // Find the base URL by getting everything before the matched pattern
    const matchIndex = currentUrl.toLowerCase().indexOf('/api/agentschat/');
    const baseUrl = currentUrl.substring(0, matchIndex);
    return `${baseUrl}/api/agents/${agentKind}/.well-known/agent-card.json`;
  }
  if (consumptionMatch && consumptionMatch[1] && consumptionMatch[2]) {
    const scaleunit = consumptionMatch[1];
    const flowId = consumptionMatch[2];
    const scaleUnitId = scaleunit.match(/^cu/i) ? scaleunit.substring(2) : scaleunit;
    const agentCardBackendHost = currentHost.replace(currentHost.split('.')[0], `app-${scaleUnitId}`).split(':')[0]; // Remove port if any
    return `${window.location.protocol}//${agentCardBackendHost}/api/agents/${flowId}/.well-known/agent-card.json`;
  }

  throw new Error(
    `data-agent-card is required or URL must follow below pattern:
 1. /api/agentsChat/{AgentKind}/IFrame for a standard app
 2. /scaleunits/{ScaleUnitId}/flows/{FlowId}/agentChat/IFrame for a consumption app`
  );
}

function parseTheme(params: URLSearchParams, dataset: DOMStringMap): Partial<ChatTheme> | undefined {
  const theme: Partial<ChatTheme> = {};

  // Check for preset theme
  const themeParam = params.get('theme');
  if (themeParam && THEME_PRESETS[themeParam]) {
    theme.colors = THEME_PRESETS[themeParam] as ChatTheme['colors'];
  }

  // Override with custom colors if provided
  if (dataset.themePrimary || dataset.themeBackground) {
    theme.colors = {
      primary: dataset.themePrimary || theme.colors?.primary || '#1976d2',
      primaryText: theme.colors?.primaryText || '#fff',
      background: dataset.themeBackground || theme.colors?.background || '#fff',
      surface: theme.colors?.surface || '#fff',
      text: theme.colors?.text || '#222',
      textSecondary: theme.colors?.textSecondary || '#666',
      border: theme.colors?.border || '#e0e0e0',
      error: theme.colors?.error || '#d32f2f',
      success: theme.colors?.success || '#388e3c',
    };
  }

  // Parse branding
  const logoUrl = dataset.logoUrl || params.get('logoUrl');
  if (logoUrl) {
    const logoSize = dataset.logoSize || params.get('logoSize');
    const logoPosition = dataset.logoPosition || params.get('logoPosition');

    theme.branding = {
      logoUrl,
      logoSize: (['small', 'medium', 'large'].includes(logoSize as string) ? logoSize : 'medium') as 'small' | 'medium' | 'large',
      logoPosition: logoPosition === 'header' || logoPosition === 'footer' ? (logoPosition as 'header' | 'footer') : 'header',
    };
  }

  return Object.keys(theme).length > 0 ? theme : undefined;
}

function parseMetadata(params: URLSearchParams, dataset: DOMStringMap): Record<string, unknown> | undefined {
  const metadataStr = dataset.metadata || params.get('metadata');
  if (!metadataStr) {
    return undefined;
  }

  try {
    return JSON.parse(metadataStr);
  } catch (e) {
    console.error('Failed to parse metadata:', e);
    return undefined;
  }
}

function parseFileUploadConfig(params: URLSearchParams, dataset: DOMStringMap) {
  // Default to true if not explicitly set to false
  const allowFileUploadStr = dataset.allowFileUpload || params.get('allowFileUpload');
  const allowFileUpload = allowFileUploadStr !== 'false';

  return {
    allowFileUpload,
    maxFileSize: dataset.maxFileSize ? Number.parseInt(dataset.maxFileSize) : undefined,
    allowedFileTypes: dataset.allowedFileTypes?.split(',').map((t) => t.trim()),
  };
}

export function parseIframeConfig(): IframeConfig {
  const params = new URLSearchParams(window.location.search);
  const dataset = document.documentElement.dataset;

  // Check portal context
  const inPortal = params.get('inPortal') === 'true';
  let trustedParentOrigin: string | undefined;

  if (inPortal) {
    const portalValidation = validatePortalSecurity(params);
    trustedParentOrigin = portalValidation.trustedParentOrigin;
  }

  // Get agent card URL
  const agentCard = extractAgentCardUrl(params, dataset);

  // Get API key (case-insensitive for URL normalization by servers)
  const apiKey = params.get('apiKey') || params.get('apikey') || dataset.apiKey;

  // Get OBO user token
  const oboUserToken = params.get('oboUserToken') || dataset.oboUserToken;

  // Parse theme
  let theme = parseTheme(params, dataset);

  // Parse file upload config
  const fileUploadConfig = parseFileUploadConfig(params, dataset);

  // Parse branding
  const brandTitle = dataset.brandTitle || params.get('brandTitle') || undefined;
  const brandSubtitle = dataset.brandSubtitle || params.get('brandSubtitle') || undefined;
  const brandLogoUrl = dataset.brandLogoUrl || params.get('brandLogoUrl') || undefined;

  // If branding properties exist, add them to the theme
  if (brandTitle || brandSubtitle || brandLogoUrl) {
    if (!theme) {
      theme = {};
    }
    theme.branding = {
      name: brandTitle,
      logoUrl: brandLogoUrl,
    };
  }

  // Build props
  const props: ChatWidgetProps = {
    agentCard,
    theme,
    userId: dataset.userId || params.get('userId') || undefined,
    userName: dataset.userName || params.get('userName') || window.LOGGED_IN_USER_NAME || undefined,
    placeholder: dataset.placeholder || params.get('placeholder') || undefined,
    welcomeMessage: brandSubtitle || dataset.welcomeMessage || params.get('welcomeMessage') || undefined,
    metadata: parseMetadata(params, dataset),
    apiKey: apiKey || undefined,
    identityProviders: parseIdentityProviders(),
    oboUserToken: oboUserToken || undefined,
    ...fileUploadConfig,
  };

  // Multi-session mode
  const singleSession = dataset.singleSession === 'true' || params.get('singleSession') === 'true';
  const multiSession = !singleSession;

  // Mode
  const mode = params.get('mode') === 'dark' ? 'dark' : 'light';

  // Context ID for session linking
  const contextId = params.get('contextId') || dataset.contextId || undefined;

  return {
    props,
    multiSession,
    apiKey,
    oboUserToken,
    mode,
    inPortal,
    trustedParentOrigin,
    contextId,
  };
}

// Declare global type for TypeScript
declare global {
  interface Window {
    LOGGED_IN_USER_NAME?: string;
    IDENTITY_PROVIDERS?: string;
  }
}

/**
 * Parses the IDENTITY_PROVIDERS global variable from a JSON string.
 * @returns The parsed identity providers or undefined if invalid/not set
 */
export function parseIdentityProviders(): Record<string, IdentityProvider> | undefined {
  const identityProviders = window.IDENTITY_PROVIDERS;

  if (!identityProviders) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(identityProviders);
    // Arrays are objects but not valid Record<string, IdentityProvider> format
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, IdentityProvider>;
    }
  } catch (e) {
    console.error('Failed to parse IDENTITY_PROVIDERS:', e);
  }

  return undefined;
}
