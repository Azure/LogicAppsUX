/**
 * Authentication handler for App Service EasyAuth
 * Handles token refresh and logout scenarios when 401 errors occur
 */

export type AuthHandlerConfig = {
  baseUrl: string;
  onRefreshSuccess?: () => void;
  onRefreshFailed?: () => void;
  onLogoutComplete?: () => void;
  onLoginSuccess?: () => void;
  onLoginFailed?: () => void;
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

/**
 * Opens logout popup and monitors for completion
 */
function openLogoutPopup(baseUrl: string, onComplete: () => void): void {
  const logoutUrl = `${baseUrl}/.auth/logout`;
  const popup = window.open(logoutUrl, 'auth-logout', 'width=600,height=700,popup=true');

  if (!popup) {
    console.error('Failed to open logout popup');
    // If popup blocked, try redirect
    window.location.href = logoutUrl;
    return;
  }

  // Monitor popup for completion
  const checkInterval = setInterval(() => {
    try {
      // Check if popup is closed
      if (popup.closed) {
        clearInterval(checkInterval);
        onComplete();
        return;
      }

      // Check if popup navigated to logout complete
      // This might fail due to cross-origin restrictions, but we try
      if (popup.location.href?.endsWith('/.auth/logout/complete')) {
        clearInterval(checkInterval);
        popup.close();
        onComplete();
        return;
      }
    } catch (_e) {
      // Cross-origin error is expected, just check if closed
      if (popup.closed) {
        clearInterval(checkInterval);
        onComplete();
      }
    }
  }, 500);

  // Timeout after 5 minutes
  setTimeout(
    () => {
      clearInterval(checkInterval);
      if (!popup.closed) {
        popup.close();
      }
      onComplete();
    },
    5 * 60 * 1000
  );
}

export interface LoginPopupOptions {
  /** Base URL of the App Service */
  baseUrl: string;
  /** URL to redirect to after successful login (relative to baseUrl) */
  postLoginRedirectUri?: string;
  /** Callback when login completes successfully */
  onSuccess?: () => void;
  /** Callback when login fails or is cancelled */
  onFailed?: () => void;
  /** Timeout in milliseconds (default: 5 minutes) */
  timeout?: number;
}

/**
 * Opens login popup for Azure App Service EasyAuth and monitors for completion
 * Uses /.auth/login/aad endpoint for Microsoft Entra ID authentication
 */
export function openLoginPopup(options: LoginPopupOptions): void {
  const { baseUrl, postLoginRedirectUri, onSuccess, onFailed, timeout = 5 * 60 * 1000 } = options;

  // Build login URL with optional redirect
  let loginUrl = `${baseUrl}/.auth/login/aad`;
  if (postLoginRedirectUri) {
    loginUrl += `?post_login_redirect_uri=${encodeURIComponent(postLoginRedirectUri)}`;
  }

  const popup = window.open(loginUrl, 'auth-login', 'width=600,height=700,popup=true');

  if (!popup) {
    console.error('[Auth] Failed to open login popup - popup may be blocked');
    onFailed?.();
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

  const handleFailure = () => {
    if (completed) {
      return;
    }
    cleanup();
    onFailed?.();
  };

  // Monitor popup for completion
  // Since we can't read cross-origin popup URLs, we poll the auth status instead
  const checkInterval = setInterval(async () => {
    if (completed) {
      return;
    }

    // Check if popup is closed by user
    if (popup.closed) {
      cleanup();

      // Give a moment for cookies to be set
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if we're now authenticated
      const isAuthenticated = await checkAuthStatus(baseUrl);

      if (isAuthenticated) {
        onSuccess?.();
      } else {
        handleFailure();
      }
      return;
    }

    // Poll auth status to detect when login completes
    // This works even with cross-origin popups
    if (wasOnDifferentOrigin) {
      try {
        const isAuthenticated = await checkAuthStatus(baseUrl);
        if (isAuthenticated) {
          console.log('[Auth] Auth status check passed - user is now authenticated!');
          handleSuccess();
          return;
        }
      } catch (_e) {
        // Ignore errors during polling
      }
    }

    // Try to detect if popup navigated away from about:blank
    try {
      const popupHref = popup.location.href;

      // Skip about:blank - popup hasn't navigated yet
      if (!popupHref || popupHref === 'about:blank') {
        return;
      }

      const popupOrigin = popup.location.origin;
      const baseOrigin = new URL(baseUrl).origin;

      console.log('[Auth] Popup URL check - origin:', popupOrigin, 'href:', popupHref);

      // If popup is on our origin (not Azure AD), check if login is complete
      if (popupOrigin === baseOrigin) {
        console.log('[Auth] Popup returned to our origin!');

        // Check if we're NOT on the initial login page
        const isLoginPage = popupHref.includes('/.auth/login/aad') && !popupHref.includes('callback');

        if (!isLoginPage) {
          console.log('[Auth] Not on login page anymore, login complete!');
          handleSuccess();
          return;
        }
      }
    } catch (_e) {
      // Cross-origin error - popup is on Azure AD's domain or the target server
      // This is expected during the OAuth flow
      wasOnDifferentOrigin = true;
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
    handleFailure();
  }, timeout);
}

/**
 * Checks if the user is currently authenticated by calling /.auth/me
 * @returns true if authenticated, false otherwise
 */
export async function checkAuthStatus(baseUrl: string): Promise<boolean> {
  try {
    console.log('[Auth] Checking auth status at:', `${baseUrl}/.auth/me`);
    const response = await fetch(`${baseUrl}/.auth/me`, {
      method: 'GET',
      credentials: 'include', // Important: include cookies for cross-origin
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // /.auth/me returns an array of identity providers, empty array or null if not authenticated
    const isAuthenticated = Array.isArray(data) && data.length > 0;
    console.log('[Auth] Is authenticated:', isAuthenticated);
    return isAuthenticated;
  } catch (error) {
    console.error('[Auth] Failed to check auth status:', error);
    return false;
  }
}

/**
 * Creates an unauthorized handler that attempts token refresh first,
 * then falls back to login popup if refresh fails (user not logged in)
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
        console.log('Token refresh successful');
        config.onRefreshSuccess?.();
        // The client will retry the failed request automatically
      } else {
        console.log('Token refresh failed, opening login popup...');
        config.onRefreshFailed?.();

        // Try login instead of logout - user might not be logged in yet
        openLoginPopup({
          baseUrl: config.baseUrl,
          postLoginRedirectUri: '/',
          onSuccess: () => {
            config.onLoginSuccess?.();
            // Refresh the page to retry with new auth
            window.location.reload();
          },
          onFailed: () => {
            config.onLoginFailed?.();
            // If login failed, try logout to clear any stale state
            openLogoutPopup(config.baseUrl, () => {
              config.onLogoutComplete?.();
              window.location.reload();
            });
          },
        });
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
