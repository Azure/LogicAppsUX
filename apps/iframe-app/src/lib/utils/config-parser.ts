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

const ALLOWED_PORTAL_AUTHORITIES = [
  'df.onecloud.azure-test.net',
  'portal.azure.com',
  'ms.portal.azure.com',
  'rc.portal.azure.com',
  'localhost:55555', // For local development
];

function validatePortalSecurity(params: URLSearchParams): PortalValidationResult {
  const trustedAuthority = params.get('trustedAuthority') || '';
  if (!trustedAuthority) {
    return {};
  }

  const parentTrustedAuthority = (trustedAuthority.split('//')[1] || '').toLowerCase();

  const isTrustedOrigin = ALLOWED_PORTAL_AUTHORITIES.some((allowedOrigin) => {
    if (allowedOrigin === parentTrustedAuthority) {
      return true;
    }
    const subdomainSuffix = `.${allowedOrigin}`;
    return (
      parentTrustedAuthority.length > subdomainSuffix.length && parentTrustedAuthority.slice(-subdomainSuffix.length) === subdomainSuffix
    );
  });

  if (!isTrustedOrigin && !parentTrustedAuthority.startsWith('localhost:')) {
    throw new Error(`The origin '${parentTrustedAuthority}' is not trusted for Frame Blade.`);
  }

  return { trustedParentOrigin: trustedAuthority };
}

function extractAgentCardUrl(params: URLSearchParams, dataset: DOMStringMap): string {
  // Support both 'agent' and 'agentCard' parameters
  const agentCard = dataset.agentCard || params.get('agentCard') || params.get('agent');

  if (agentCard) {
    return agentCard;
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
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, IdentityProvider>;
    }
  } catch (e) {
    console.error('Failed to parse IDENTITY_PROVIDERS:', e);
  }

  return undefined;
}
