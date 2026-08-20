/**
 * Security utilities for validating message origins
 */

function isLocalDevelopment(): boolean {
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
}

export function getAllowedOrigins(trustedParentOrigin?: string): string[] {
  const dataset = document.documentElement.dataset;
  const currentOrigin = window.location.origin;
  const allowedOrigins = [currentOrigin];

  // These origins are fixed development defaults, not iframe query data.
  if (isLocalDevelopment()) {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000');
  }

  // Only configuration rendered inside the iframe document may extend inbound trust.
  const configuredOrigins = dataset.allowedOrigins;
  if (configuredOrigins) {
    allowedOrigins.push(...configuredOrigins.split(',').map((origin) => origin.trim()));
  }

  // trustedParentOrigin has already been allowlisted by config-parser.
  if (trustedParentOrigin) {
    allowedOrigins.push(trustedParentOrigin);
  }

  return [...new Set(allowedOrigins.filter(Boolean))];
}

export function isOriginAllowed(origin: string, allowedOrigins: string[]): boolean {
  // Direct match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check for wildcard subdomain patterns (e.g., "*.example.com")
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      try {
        const originUrl = new URL(origin);
        // Check if it's a subdomain (not the domain itself)
        if (originUrl.hostname.endsWith(`.${domain}`)) {
          return true;
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return false;
}

export function getParentOrigin(trustedParentOrigin?: string): string {
  if (trustedParentOrigin) {
    return trustedParentOrigin;
  }

  // A referrer may target the non-sensitive ready signal only when independently
  // authorized by same-origin, local-development, or document configuration.
  if (document.referrer) {
    try {
      const referrerOrigin = new URL(document.referrer).origin;
      if (isOriginAllowed(referrerOrigin, getAllowedOrigins())) {
        return referrerOrigin;
      }
    } catch (_e) {
      // Invalid referrer URL
    }
  }

  // Fallback to current origin (safer than '*')
  return window.location.origin;
}
