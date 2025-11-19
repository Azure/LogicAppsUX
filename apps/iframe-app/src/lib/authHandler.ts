/**
 * Authentication handler for App Service EasyAuth
 * Handles token refresh and logout scenarios when 401 errors occur
 */

export type AuthHandlerConfig = {
  baseUrl: string;
  onRefreshSuccess?: () => void;
  onRefreshFailed?: () => void;
  onLogoutComplete?: () => void;
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
      if (popup.location.href?.endsWith(`/.auth/logout/complete`)) {
        clearInterval(checkInterval);
        popup.close();
        onComplete();
        return;
      }
    } catch (e) {
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

/**
 * Creates an unauthorized handler that attempts token refresh first,
 * then falls back to logout if refresh fails
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
        console.log('Token refresh failed, initiating logout...');
        config.onRefreshFailed?.();

        openLogoutPopup(config.baseUrl, () => {
          console.log('Logout complete, refreshing page...');
          config.onLogoutComplete?.();
          // Refresh the page to force re-authentication
          window.location.reload();
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
