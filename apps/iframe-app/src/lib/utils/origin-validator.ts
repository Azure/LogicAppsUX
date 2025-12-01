/**
 * Security utilities for validating message origins
 */

export function getAllowedOrigins(): string[] {
  const params = new URLSearchParams(window.location.search);
  const dataset = document.documentElement.dataset;

  // Check for explicitly configured allowed origins
  const allowedOriginsStr = dataset.allowedOrigins || params.get('allowedOrigins');

  if (allowedOriginsStr) {
    return allowedOriginsStr.split(',').map((origin) => origin.trim());
  }

  // Default allowed origins
  const currentOrigin = window.location.origin;
  const allowedOrigins = [currentOrigin];

  // Add development origins if in dev environment
  if (currentOrigin.includes('localhost') || currentOrigin.includes('127.0.0.1')) {
    allowedOrigins.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000');
  }

  // Add document referrer if it exists
  if (document.referrer) {
    try {
      const referrerOrigin = new URL(document.referrer).origin;
      if (!allowedOrigins.includes(referrerOrigin)) {
        allowedOrigins.push(referrerOrigin);
      }
    } catch (e) {
      // Invalid referrer URL, ignore
    }
  }

  return allowedOrigins;
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
        if (originUrl.hostname.endsWith('.' + domain)) {
          return true;
        }
      } catch {
        // Invalid URL, skip
      }
    }
  }

  return false;
}

export function getParentOrigin(): string {
  // Try to get parent origin from referrer
  if (document.referrer) {
    try {
      return new URL(document.referrer).origin;
    } catch (e) {
      // Invalid referrer URL
    }
  }

  // Fallback to current origin (safer than '*')
  return window.location.origin;
}
