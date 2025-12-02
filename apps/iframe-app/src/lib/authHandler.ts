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
    console.error('Failed to open login popup - popup may be blocked');
    onFailed?.();
    return;
  }

  let loginSucceeded = false;

  // Monitor popup for completion
  const checkInterval = setInterval(() => {
    try {
      // Check if popup is closed
      if (popup.closed) {
        clearInterval(checkInterval);
        if (loginSucceeded) {
          onSuccess?.();
        } else {
          // Popup closed without confirmed success - check if we have a valid session
          checkAuthStatus(baseUrl).then((isAuthenticated) => {
            if (isAuthenticated) {
              onSuccess?.();
            } else {
              onFailed?.();
            }
          });
        }
        return;
      }

      // Try to detect successful login by checking the URL
      // This might fail due to cross-origin restrictions
      try {
        const popupUrl = popup.location.href;
        // Check if redirected back to our app (login complete)
        if (popupUrl && popupUrl.startsWith(baseUrl) && !popupUrl.includes('/.auth/login')) {
          loginSucceeded = true;
          clearInterval(checkInterval);
          popup.close();
          onSuccess?.();
          return;
        }
      } catch (_urlError) {
        // Cross-origin error is expected during OAuth flow
      }
    } catch (_e) {
      // Cross-origin error is expected, just check if closed
      if (popup.closed) {
        clearInterval(checkInterval);
        // Check auth status when popup closes
        checkAuthStatus(baseUrl).then((isAuthenticated) => {
          if (isAuthenticated) {
            onSuccess?.();
          } else {
            onFailed?.();
          }
        });
      }
    }
  }, 500);

  // Timeout
  setTimeout(() => {
    clearInterval(checkInterval);
    if (!popup.closed) {
      popup.close();
    }
    onFailed?.();
  }, timeout);
}

/**
 * Checks if the user is currently authenticated by calling /.auth/me
 * @returns true if authenticated, false otherwise
 */
export async function checkAuthStatus(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/.auth/me`, {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    // /.auth/me returns an array of identity providers, empty if not authenticated
    return Array.isArray(data) && data.length > 0;
  } catch (error) {
    console.error('Failed to check auth status:', error);
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
      console.log('Attempting to refresh authentication token...');
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
            console.log('Login successful, refreshing page...');
            config.onLoginSuccess?.();
            // Refresh the page to retry with new auth
            window.location.reload();
          },
          onFailed: () => {
            console.log('Login failed or cancelled, falling back to logout...');
            config.onLoginFailed?.();
            // If login failed, try logout to clear any stale state
            openLogoutPopup(config.baseUrl, () => {
              console.log('Logout complete, refreshing page...');
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
