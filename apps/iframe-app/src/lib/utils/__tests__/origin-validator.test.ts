import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getAllowedOrigins, isOriginAllowed, getParentOrigin } from '../origin-validator';

describe('origin-validator', () => {
  beforeEach(() => {
    // Reset window.location
    delete (window as any).location;
    (window as any).location = new URL('http://localhost:3000');

    // Reset document properties
    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
    });

    // Clear dataset properties
    Object.keys(document.documentElement.dataset).forEach((key) => {
      delete document.documentElement.dataset[key];
    });
  });

  describe('getAllowedOrigins', () => {
    it('should return current origin by default', () => {
      const origins = getAllowedOrigins();
      expect(origins).toContain('http://localhost:3000');
    });

    it('should add development origins when on localhost', () => {
      const origins = getAllowedOrigins();
      expect(origins).toContain('http://localhost:3000');
      expect(origins).toContain('http://localhost:3001');
      expect(origins).toContain('http://127.0.0.1:3000');
    });

    it('should parse allowed origins from URL parameter', () => {
      (window as any).location = new URL(
        'http://localhost:3000?allowedOrigins=https://example.com,https://app.example.com'
      );

      const origins = getAllowedOrigins();
      expect(origins).toContain('https://example.com');
      expect(origins).toContain('https://app.example.com');
    });

    it('should parse allowed origins from data attribute', () => {
      document.documentElement.dataset.allowedOrigins = 'https://data1.com,https://data2.com';

      const origins = getAllowedOrigins();
      expect(origins).toContain('https://data1.com');
      expect(origins).toContain('https://data2.com');
    });

    it('should include document referrer if present', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'https://parent.example.com/page',
        configurable: true,
      });

      const origins = getAllowedOrigins();
      expect(origins).toContain('https://parent.example.com');
    });
  });

  describe('isOriginAllowed', () => {
    it('should allow direct match', () => {
      const allowedOrigins = ['https://example.com', 'https://app.example.com'];

      expect(isOriginAllowed('https://example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://app.example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://other.com', allowedOrigins)).toBe(false);
    });

    it('should support wildcard subdomain patterns', () => {
      const allowedOrigins = ['*.example.com'];

      expect(isOriginAllowed('https://app.example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://admin.example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://deep.sub.example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://example.com', allowedOrigins)).toBe(false);
      expect(isOriginAllowed('https://notexample.com', allowedOrigins)).toBe(false);
    });

    it('should handle invalid URLs gracefully', () => {
      const allowedOrigins = ['*.example.com'];

      expect(isOriginAllowed('not-a-url', allowedOrigins)).toBe(false);
    });
  });

  describe('getParentOrigin', () => {
    it('should return referrer origin if available', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'https://parent.example.com/page',
        configurable: true,
      });

      expect(getParentOrigin()).toBe('https://parent.example.com');
    });

    it('should fallback to current origin if no referrer', () => {
      expect(getParentOrigin()).toBe('http://localhost:3000');
    });

    it('should handle invalid referrer gracefully', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'not-a-valid-url',
        configurable: true,
      });

      expect(getParentOrigin()).toBe('http://localhost:3000');
    });
  });
});
