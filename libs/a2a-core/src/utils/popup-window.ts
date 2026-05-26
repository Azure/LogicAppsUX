export interface PopupWindowOptions {
  width?: number;
  height?: number;
  left?: number;
  top?: number;
}

export interface PopupWindowResult {
  closed: boolean;
  error?: Error;
}

const ALLOWED_POPUP_PROTOCOLS = new Set(['https:']);

/**
 * Validates that a URL uses an allowed protocol (https: only).
 * Blocks javascript:, data:, vbscript:, and other dangerous schemes.
 * Allows http: for localhost URLs in development environments.
 */
export function validatePopupUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`Invalid URL for authentication popup: ${url}`);
  }

  // Allow http: for localhost in development
  if (parsed.protocol === 'http:' && (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1')) {
    return parsed;
  }

  if (!ALLOWED_POPUP_PROTOCOLS.has(parsed.protocol)) {
    throw new Error(`Blocked authentication popup with disallowed protocol: ${parsed.protocol}`);
  }

  return parsed;
}

/**
 * Opens a popup window and returns a promise that resolves when the window is closed.
 * Only allows https: URLs to prevent DOM XSS via javascript: protocol injection.
 */
export async function openPopupWindow(url: string, windowName = 'a2a-auth', options: PopupWindowOptions = {}): Promise<PopupWindowResult> {
  validatePopupUrl(url);

  const {
    width = 600,
    height = 700,
    left = window.screenX + (window.outerWidth - width) / 2,
    top = window.screenY + (window.outerHeight - height) / 2,
  } = options;

  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'toolbar=no',
    'menubar=no',
    'scrollbars=yes',
    'resizable=yes',
    'status=no',
  ].join(',');

  const popup = window.open(url, windowName, features);

  if (!popup) {
    throw new Error('Failed to open popup window. Please check your popup blocker settings.');
  }

  // Prevent the opened window from accessing window.opener (XSS mitigation).
  // We set this after opening instead of using the 'noopener' window feature,
  // because 'noopener' causes window.open() to return null, which prevents
  // us from monitoring when the popup closes.
  try {
    popup.opener = null;
  } catch {
    // Cross-origin windows may throw — this is expected and acceptable
    // since cross-origin popups can't access opener anyway.
  }

  // Focus the popup
  popup.focus();

  return new Promise<PopupWindowResult>((resolve) => {
    let resolved = false;

    const handleClose = () => {
      if (!resolved) {
        resolved = true;
        clearInterval(checkInterval);
        clearTimeout(timeout);
        resolve({ closed: true });
      }
    };

    // Immediate check - popup may close very quickly in automated tests
    if (popup.closed) {
      handleClose();
      return;
    }

    const checkInterval = setInterval(() => {
      try {
        if (popup.closed) {
          handleClose();
        }
      } catch (_error) {
        // Cross-origin errors are expected when checking the popup
        // We can safely ignore them and continue checking if the window is closed
      }
    }, 100); // Reduced from 500ms to 100ms for faster detection

    // Optional: Add a timeout to prevent indefinite waiting
    const timeout = setTimeout(
      () => {
        if (!resolved) {
          resolved = true;
          clearInterval(checkInterval);
          if (!popup.closed) {
            popup.close();
          }
          resolve({
            closed: true,
            error: new Error('Authentication timeout - window was closed automatically'),
          });
        }
      },
      10 * 60 * 1000
    ); // 10 minutes timeout
  });
}

/**
 * Check if we're in a browser environment that supports popups
 */
export function isPopupSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.open === 'function';
}
