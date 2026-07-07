/**
 * Authentication handler for App Service EasyAuth
 * Handles token refresh, login popup, and logout scenarios when 401 errors occur
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

interface JwtPayload {
  exp?: number;
  iat?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  [key: string]: unknown;
}

export interface AuthInformation {
  isAuthenticated: boolean;
  /**
   * Indicates whether Azure App Service EasyAuth is configured on the Logic App.
   * - `true`: EasyAuth is configured (/.auth/me returns 401, 403, 302, or 200)
   * - `false`: EasyAuth is NOT configured (/.auth/me returns 404 or network error)
   *
   * When false, the application should skip authentication flows entirely.
   */
  isEasyAuthConfigured: boolean;
  error: Error | null;
  username?: string;
}

export interface AuthHandlerConfig {
  baseUrl: string;
  onRefreshSuccess?: () => void;
  onRefreshFailed?: () => void;
  /** Called when login is required (after refresh fails) */
  onLoginRequired: () => void;
}

export interface LoginPopupOptions {
  /** Base URL of the App Service */
  baseUrl: string;
  /** Path to the sign-in endpoint */
  signInEndpoint?: string;
  /** URL to redirect to after successful login (relative to baseUrl) */
  postLoginRedirectUri?: string;
  /** Callback when login completes successfully, receives auth information including username */
  onSuccess?: (authInfo: AuthInformation) => void;
  /** Callback when login fails or is cancelled */
  onFailed?: (error: Error) => void;
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
}

// ============================================================================
// Private Helper Functions
// ============================================================================

/**
 * Attempts to refresh the authentication token via EasyAuth refresh endpoint
 * @returns true if refresh succeeded, false otherwise
 */
async function refreshAuthToken(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/.auth/refresh`, {
      method: 'GET',
      credentials: 'same-origin',
    });
    return response.ok;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return false;
  }
}

/**
 * Extracts username from JWT access token in the auth response
 */
function extractUsernameFromToken(accessToken: string | undefined): string | undefined {
  if (!accessToken) {
    return undefined;
  }
  try {
    const decodedJwt = decodeJwtPayload(accessToken);
    return decodedJwt.name as string | undefined;
  } catch {
    // Invalid JWT token, continue without username
    return undefined;
  }
}

// ============================================================================
// Public API - JWT Utilities
// ============================================================================

/**
 * Decodes a JWT token payload without verifying the signature.
 * Use this only for reading claims client-side; signature verification should happen server-side.
 * @param token The JWT token string
 * @returns The decoded payload object
 * @throws Error if the token format is invalid
 */
export function decodeJwtPayload(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const base64Url = parts[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4);

  const jsonPayload = decodeURIComponent(
    atob(padded)
      .split('')
      .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join('')
  );

  return JSON.parse(jsonPayload);
}

// ============================================================================
// Public API - URL Utilities
// ============================================================================

/**
 * Extracts base URL from current window location or agent card URL
 */
export function getBaseUrl(agentCardUrl?: string): string {
  if (agentCardUrl) {
    try {
      const url = new URL(agentCardUrl);
      return url.origin;
    } catch {
      // Invalid URL, fall back to current origin
    }
  }
  return window.location.origin;
}

// ============================================================================
// Public API - Authentication Status
// ============================================================================

/**
 * Checks the current authentication status via EasyAuth /.auth/me endpoint
 * Also extracts username from the JWT token if available
 *
 * Easy Auth can be configured to return different status codes for unauthenticated requests:
 * - 401 Unauthorized
 * - 403 Forbidden
 * - 404 Not Found (this means Easy Auth is NOT configured)
 * - 302 Redirect
 *
 * Any of 401, 403, or 302 indicates Easy Auth IS configured but user is not authenticated.
 */
export async function checkAuthStatus(baseUrl: string): Promise<AuthInformation> {
  try {
    const response = await fetch(`${baseUrl}/.auth/me`, {
      method: 'GET',
      credentials: 'include', // Important: include cookies for cross-origin
      redirect: 'manual', // Don't follow redirects - we want to detect 302
    });

    const status = response.status;

    // 404 means Easy Auth is not configured on this Logic App
    if (status === 404) {
      return { isAuthenticated: false, isEasyAuthConfigured: false, error: null };
    }

    // 401, 403 mean Easy Auth is configured but user is not authenticated
    if (status === 401 || status === 403) {
      return { isAuthenticated: false, isEasyAuthConfigured: true, error: null };
    }

    // 0 status with opaqueredirect type means a 302 redirect was attempted
    // This happens when redirect: 'manual' is set and server tries to redirect
    if (response.type === 'opaqueredirect' || status === 0) {
      return { isAuthenticated: false, isEasyAuthConfigured: true, error: null };
    }

    if (!response.ok) {
      return { isAuthenticated: false, isEasyAuthConfigured: true, error: new Error('Failed to fetch authentication status') };
    }

    const data = await response.json();
    // /.auth/me returns an array of identity providers, empty array or null if not authenticated
    const isAuthenticated = Array.isArray(data) && data.length > 0;
    const username = extractUsernameFromToken(data[0]?.access_token);

    return { isAuthenticated, isEasyAuthConfigured: true, error: null, username };
  } catch (error) {
    // Network errors or other failures - assume Easy Auth is not configured
    return { isAuthenticated: false, isEasyAuthConfigured: false, error: error as Error };
  }
}

// ============================================================================
// Public API - Login Popup
// ============================================================================

/**
 * Trusted Microsoft Logic Apps domains that the login popup is allowed to navigate to
 * in addition to the hosting page's own origin. Kept in sync with the agent card
 * allowlist in `config-parser.ts`.
 */
const ALLOWED_LOGIN_DOMAINS = ['.logic.azure.com', '.logic-apps.azure.com'];

/**
 * Normalizes and validates a login popup URL to prevent client-side open-redirect
 * (a.k.a. `window.open` hijacking). The URL — which is built from the potentially
 * user-influenced `baseUrl`/`signInEndpoint` values — is parsed into a `URL` object
 * and then strictly matched against the current origin or a trusted domain allowlist.
 *
 * @returns the canonicalized, safe URL string, or `null` if the URL is untrusted/invalid.
 */
function getValidatedLoginUrl(loginUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(loginUrl);
  } catch {
    return null;
  }

  const hostname = parsed.hostname.toLowerCase();
  const isLocalhostHost = hostname === 'localhost' || hostname === '127.0.0.1';

  // Only https is allowed, except http on localhost during local development.
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLocalhostHost)) {
    return null;
  }

  // Same origin as the hosting page is always trusted — EasyAuth lives on the app's own origin.
  if (parsed.origin === window.location.origin) {
    return parsed.href;
  }

  // localhost is only trusted when the app itself is running locally.
  if (isLocalhostHost) {
    const isLocalDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return isLocalDevelopment ? parsed.href : null;
  }

  // Otherwise the host must belong to a trusted Microsoft Logic Apps domain.
  const isTrustedDomain = ALLOWED_LOGIN_DOMAINS.some((domain) => hostname === domain.slice(1) || hostname.endsWith(domain));

  return isTrustedDomain ? parsed.href : null;
}

/**
 * Opens login popup for Azure App Service EasyAuth and monitors for completion.
 * Supports dynamic identity providers via the signInEndpoint parameter.
 * The popup is monitored for navigation back to the app origin or closure.
 */
export function openLoginPopup(options: LoginPopupOptions): void {
  const { baseUrl, signInEndpoint, postLoginRedirectUri, onSuccess, onFailed, timeout = 5 * 60 * 1000 } = options;

  // Build login URL with optional redirect
  let loginUrl = `${baseUrl}${signInEndpoint}`;
  if (postLoginRedirectUri) {
    loginUrl += `?post_login_redirect_uri=${encodeURIComponent(postLoginRedirectUri)}`;
  }

  // Validate the (potentially user-influenced) URL before navigating to guard against
  // client-side open-redirect via crafted base URL or sign-in endpoint values.
  const validatedLoginUrl = getValidatedLoginUrl(loginUrl);
  if (!validatedLoginUrl) {
    onFailed?.(new Error('Blocked login popup with an untrusted or invalid URL.'));
    return;
  }

  const popup = window.open(validatedLoginUrl, 'auth-login', 'width=600,height=700,popup=true');

  if (!popup) {
    onFailed?.(new Error('Failed to open login popup'));
    return;
  }

  let completed = false;
  let wasOnDifferentOrigin = false;

  const cleanup = () => {
    completed = true;
    clearInterval(checkInterval);
    clearTimeout(timeoutId);
  };

  const handleSuccess = (authInfo: AuthInformation) => {
    if (completed) {
      return;
    }
    cleanup();
    if (!popup.closed) {
      popup.close();
    }
    onSuccess?.(authInfo);
  };

  const handleFailure = (error: Error) => {
    if (completed) {
      return;
    }
    cleanup();
    onFailed?.(error);
  };

  // Monitor popup for completion
  const checkInterval = setInterval(async () => {
    if (completed) {
      return;
    }

    const popupIsClosed = popup.closed;

    // Determine if we should check auth status
    // (either popup closed OR we've seen cross-origin navigation indicating OAuth flow)
    const shouldCheckAuth = popupIsClosed || wasOnDifferentOrigin;

    if (!shouldCheckAuth) {
      // Try to detect if popup navigated away from about:blank
      try {
        const popupHref = popup.location.href;

        // Skip about:blank - popup hasn't navigated yet
        if (!popupHref || popupHref === 'about:blank') {
          return;
        }

        const popupOrigin = popup.location.origin;
        const baseOrigin = new URL(baseUrl).origin;

        // If popup is on our origin (not Azure AD), check if login is complete
        if (popupOrigin === baseOrigin) {
          // Check if we're NOT on the initial login page
          const isLoginPage = popupHref.includes('/.auth/login/') && !popupHref.includes('callback');

          if (!isLoginPage) {
            // Fetch auth info before calling success
            const authInfo = await checkAuthStatus(baseUrl);
            if (authInfo.isAuthenticated) {
              handleSuccess(authInfo);
            }
          }
        }
      } catch (_e) {
        // Cross-origin error - popup is on Azure AD's domain or the target server
        // This is expected during the OAuth flow
        wasOnDifferentOrigin = true;
      }
      return;
    }

    // Re-check: another tick may have completed during the async block above
    if (completed) {
      return;
    }

    // If popup just closed, give a moment for cookies to be set
    if (popupIsClosed) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (completed) {
      return;
    }

    try {
      const authInfo = await checkAuthStatus(baseUrl);

      if (completed) {
        return;
      }

      if (authInfo.isAuthenticated) {
        handleSuccess(authInfo);
      } else if (popupIsClosed) {
        // Only fail when popup is closed AND user is not authenticated
        handleFailure(authInfo.error ?? new Error('Login cancelled or failed'));
      }
      // If not authenticated but popup still open, keep polling
    } catch (error) {
      if (popupIsClosed && !completed) {
        const err = error instanceof Error ? error : new Error('Login failed');
        handleFailure(err);
      }
    }
  }, 500);

  // Timeout handler
  const timeoutId = setTimeout(() => {
    if (completed) {
      return;
    }
    console.log('[Auth] Login timed out');
    if (!popup.closed) {
      popup.close();
    }
    handleFailure(new Error('Login timed out'));
  }, timeout);
}

// ============================================================================
// Public API - Unauthorized Handler
// ============================================================================

/**
 * Creates an unauthorized handler that attempts token refresh first,
 * then calls onLoginRequired if refresh fails.
 * Prevents multiple simultaneous auth attempts.
 */
export function createUnauthorizedHandler(config: AuthHandlerConfig) {
  let isHandling = false;

  return async () => {
    // Prevent multiple simultaneous auth attempts
    if (isHandling) {
      return;
    }

    isHandling = true;

    try {
      const refreshSuccess = await refreshAuthToken(config.baseUrl);

      if (refreshSuccess) {
        config.onRefreshSuccess?.();
        // Reload to retry with refreshed token
        window.location.reload();
      } else {
        config.onRefreshFailed?.();
        config.onLoginRequired();
      }
    } finally {
      isHandling = false;
    }
  };
}
