/**
 * Authentication handler for App Service EasyAuth
 * Handles token refresh and logout scenarios when 401 errors occur
 */
export type AuthHandlerConfig = {
  baseUrl: string;
  onRefreshSuccess?: () => void;
  onRefreshFailed?: () => void;
  /** Called when login is required (after refresh fails) */
  onLoginRequired: () => void;
};

/**
 * Attempts to refresh the authentication token
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

export interface LoginPopupOptions {
  /** Base URL of the App Service */
  baseUrl: string;
  /** URL to redirect to after successful login (relative to baseUrl) */
  postLoginRedirectUri?: string;
  /** Callback when login completes successfully */
  onSuccess?: () => void;
  /** Callback when login fails or is cancelled */
  onFailed?: (error: Error) => void;
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
  /** Path to the sign-in endpoint */
  signInEndpoint?: string;
}

/**
 * Opens login popup for Azure App Service EasyAuth and monitors for completion
 * Supports dynamic identity providers via the signInEndpoint parameter
 */
export function openLoginPopup(options: LoginPopupOptions): void {
  const { baseUrl, signInEndpoint, postLoginRedirectUri, onSuccess, onFailed, timeout = 5 * 60 * 1000 } = options;

  // Build login URL with optional redirect
  let loginUrl = `${baseUrl}${signInEndpoint}`;
  if (postLoginRedirectUri) {
    loginUrl += `?post_login_redirect_uri=${encodeURIComponent(postLoginRedirectUri)}`;
  }

  const popup = window.open(loginUrl, 'auth-login', 'width=600,height=700,popup=true');

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

  const handleSuccess = () => {
    if (completed) {
      return;
    }
    cleanup();
    if (!popup.closed) {
      popup.close();
    }
    onSuccess?.();
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
            handleSuccess();
          }
        }
      } catch (_e) {
        // Cross-origin error - popup is on Azure AD's domain or the target server
        // This is expected during the OAuth flow
        wasOnDifferentOrigin = true;
      }
      return;
    }

    // Single path for auth checking - prevents duplicate success calls
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
      const { isAuthenticated, error } = await checkAuthStatus(baseUrl);

      if (completed) {
        return;
      }

      if (isAuthenticated) {
        handleSuccess();
      } else if (!isAuthenticated && !completed) {
        // Only fail if popup is closed AND not authenticated
        handleFailure(error as Error);
      } else if (popupIsClosed && !completed) {
        // Only fail if popup is closed AND not authenticated
        handleFailure(new Error('Login cancelled or failed'));
      }
      // If not authenticated but popup still open, keep polling
    } catch (error) {
      if (popupIsClosed && !completed) {
        const err = error instanceof Error ? error : new Error('Login failed');
        handleFailure(err);
      }
    }
  }, 500); // Poll every 500ms

  // Timeout
  const timeoutId = setTimeout(() => {
    if (completed) {
      return;
    }
    console.log('[Auth] Login timed out');
    cleanup();
    if (!popup.closed) {
      popup.close();
    }
    handleFailure(new Error('Login timed out'));
  }, timeout);
}

export async function checkAuthStatus(baseUrl: string): Promise<{ isAuthenticated: boolean; error: Error | null }> {
  try {
    const response = await fetch(`${baseUrl}/.auth/me`, {
      method: 'GET',
      credentials: 'include', // Important: include cookies for cross-origin
    });

    if (!response.ok) {
      return { isAuthenticated: false, error: new Error('Failed to fetch authentication status') };
    }

    const data = await response.json();
    // /.auth/me returns an array of identity providers, empty array or null if not authenticated
    const isAuthenticated = Array.isArray(data) && data.length > 0;
    return { isAuthenticated, error: null };
  } catch (error) {
    return { isAuthenticated: false, error: error as Error };
  }
}

/**
 * Creates an unauthorized handler that attempts token refresh first,
 * then calls onLoginRequired if refresh fails
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
