import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { getAllowedOrigins, getParentOrigin, isOriginAllowed } from '../origin-validator';

describe('origin-validator', () => {
  const originalLocation = window.location;

  const setLocation = (url: string) => {
    Object.defineProperty(window, 'location', {
      value: new URL(url),
      configurable: true,
    });
  };

  beforeEach(() => {
    setLocation('https://iframe.logic.azure.com/iframe.html');
    Object.defineProperty(document, 'referrer', {
      value: '',
      configurable: true,
    });
    Object.keys(document.documentElement.dataset).forEach((key) => {
      delete document.documentElement.dataset[key];
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      configurable: true,
    });
  });

  describe('getAllowedOrigins', () => {
    it('allows the iframe origin by default', () => {
      expect(getAllowedOrigins()).toEqual(['https://iframe.logic.azure.com']);
    });

    it('allows fixed development origins only when the iframe is local', () => {
      setLocation('http://localhost:5173/iframe.html');

      expect(getAllowedOrigins()).toEqual(
        expect.arrayContaining(['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'])
      );
    });

    it('does not enable development origins for a localhost lookalike hostname', () => {
      setLocation('https://localhost.attacker.example/iframe.html');

      expect(getAllowedOrigins()).toEqual(['https://localhost.attacker.example']);
    });

    it('uses origins configured inside the iframe document', () => {
      document.documentElement.dataset.allowedOrigins = 'https://designer.example.com,https://admin.example.com';

      expect(getAllowedOrigins()).toEqual(expect.arrayContaining(['https://designer.example.com', 'https://admin.example.com']));
    });

    it('uses an already validated trusted parent origin', () => {
      expect(getAllowedOrigins('https://portal.azure.com')).toEqual(
        expect.arrayContaining(['https://iframe.logic.azure.com', 'https://portal.azure.com'])
      );
    });

    it('does not trust origins supplied only through the iframe query string', () => {
      setLocation('https://iframe.logic.azure.com/iframe.html?allowedOrigins=https://attacker.example,https://other.example');

      expect(getAllowedOrigins()).toEqual(['https://iframe.logic.azure.com']);
    });

    it('does not trust the document referrer by itself', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'https://attacker.example/embed',
        configurable: true,
      });

      expect(getAllowedOrigins()).toEqual(['https://iframe.logic.azure.com']);
    });
  });

  describe('isOriginAllowed', () => {
    it('allows direct matches only', () => {
      const allowedOrigins = ['https://example.com', 'https://app.example.com'];

      expect(isOriginAllowed('https://example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://app.example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://other.com', allowedOrigins)).toBe(false);
    });

    it('supports explicitly configured wildcard subdomains', () => {
      const allowedOrigins = ['*.example.com'];

      expect(isOriginAllowed('https://app.example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://deep.sub.example.com', allowedOrigins)).toBe(true);
      expect(isOriginAllowed('https://example.com', allowedOrigins)).toBe(false);
      expect(isOriginAllowed('https://notexample.com', allowedOrigins)).toBe(false);
    });

    it('handles invalid origins gracefully', () => {
      expect(isOriginAllowed('not-a-url', ['*.example.com'])).toBe(false);
    });
  });

  describe('getParentOrigin', () => {
    it('prefers an already validated trusted parent origin', () => {
      expect(getParentOrigin('https://portal.azure.com')).toBe('https://portal.azure.com');
    });

    it('uses a referrer that is independently configured inside the iframe document', () => {
      document.documentElement.dataset.allowedOrigins = 'https://parent.example.com';
      Object.defineProperty(document, 'referrer', {
        value: 'https://parent.example.com/embed',
        configurable: true,
      });

      expect(getParentOrigin()).toBe('https://parent.example.com');
    });

    it('uses a local development referrer covered by fixed defaults', () => {
      setLocation('http://localhost:5173/iframe.html');
      Object.defineProperty(document, 'referrer', {
        value: 'http://localhost:3000/embed',
        configurable: true,
      });

      expect(getParentOrigin()).toBe('http://localhost:3000');
    });

    it('does not use an untrusted referrer as the parent origin', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'https://attacker.example/embed',
        configurable: true,
      });

      expect(getParentOrigin()).toBe('https://iframe.logic.azure.com');
    });

    it('falls back to the current origin for an invalid referrer', () => {
      Object.defineProperty(document, 'referrer', {
        value: 'not-a-valid-url',
        configurable: true,
      });

      expect(getParentOrigin()).toBe('https://iframe.logic.azure.com');
    });
  });
});
