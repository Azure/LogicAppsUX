import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUnauthorizedHandler, getBaseUrl, openLoginPopup, checkAuthStatus, decodeJwtPayload } from '../authHandler';

// Helper to create a mock JWT token with a given payload
function createMockJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payloadStr = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${payloadStr}.${signature}`;
}

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.open
const mockWindowOpen = vi.fn();
global.window.open = mockWindowOpen;

// Mock window.location
const mockLocation = {
  origin: 'https://example.com',
  reload: vi.fn(),
  href: '',
};
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

describe('authHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('getBaseUrl', () => {
    it('should extract base URL from agent card URL', () => {
      const agentCardUrl = 'https://app.example.com/api/agents/assistant/.well-known/agent-card.json';
      expect(getBaseUrl(agentCardUrl)).toBe('https://app.example.com');
    });

    it('should return window.location.origin for invalid URL', () => {
      const invalidUrl = 'not-a-valid-url';
      expect(getBaseUrl(invalidUrl)).toBe('https://example.com');
    });

    it('should return window.location.origin when no URL provided', () => {
      expect(getBaseUrl()).toBe('https://example.com');
    });
  });

  describe('decodeJwtPayload', () => {
    it('should decode a valid JWT payload', () => {
      const payload = { sub: 'user123', name: 'John Doe', exp: 1234567890 };
      const token = createMockJwt(payload);

      const result = decodeJwtPayload(token);

      expect(result.sub).toBe('user123');
      expect(result.name).toBe('John Doe');
      expect(result.exp).toBe(1234567890);
    });

    it('should decode JWT with special characters in payload', () => {
      // Use ASCII-compatible special characters since btoa() doesn't handle UTF-8
      const payload = { name: "John O'Brien", email: 'test+special@example.com', path: '/api/v1?query=value&other=123' };
      const token = createMockJwt(payload);

      const result = decodeJwtPayload(token);

      expect(result.name).toBe("John O'Brien");
      expect(result.email).toBe('test+special@example.com');
      expect(result.path).toBe('/api/v1?query=value&other=123');
    });

    it('should handle base64url encoding with - and _ characters', () => {
      // Create a token with base64url characters (- and _)
      const header = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9'; // standard header
      const payload = { sub: 'user-123_abc', name: 'Test User' };
      const payloadBase64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const token = `${header}.${payloadBase64}.signature`;

      const result = decodeJwtPayload(token);

      expect(result.sub).toBe('user-123_abc');
      expect(result.name).toBe('Test User');
    });

    it('should throw error for invalid JWT format (less than 3 parts)', () => {
      expect(() => decodeJwtPayload('invalid.token')).toThrow('Invalid JWT format');
    });

    it('should throw error for invalid JWT format (more than 3 parts)', () => {
      expect(() => decodeJwtPayload('a.b.c.d')).toThrow('Invalid JWT format');
    });

    it('should throw error for empty string', () => {
      expect(() => decodeJwtPayload('')).toThrow('Invalid JWT format');
    });

    it('should decode JWT with nested objects in payload', () => {
      const payload = {
        sub: 'user123',
        claims: { role: 'admin', permissions: ['read', 'write'] },
      };
      const token = createMockJwt(payload);

      const result = decodeJwtPayload(token);

      expect(result.sub).toBe('user123');
      expect(result.claims).toEqual({ role: 'admin', permissions: ['read', 'write'] });
    });

    it('should decode JWT with standard claims', () => {
      const payload = {
        iss: 'https://issuer.example.com',
        sub: 'user123',
        aud: 'client-app',
        exp: 9999999999,
        iat: 1234567890,
      };
      const token = createMockJwt(payload);

      const result = decodeJwtPayload(token);

      expect(result.iss).toBe('https://issuer.example.com');
      expect(result.sub).toBe('user123');
      expect(result.aud).toBe('client-app');
      expect(result.exp).toBe(9999999999);
      expect(result.iat).toBe(1234567890);
    });
  });

  describe('checkAuthStatus', () => {
    it('should return true and username when user is authenticated', async () => {
      const mockToken = createMockJwt({ name: 'John Doe', sub: 'user123', exp: 9999999999 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ provider_name: 'aad', user_id: 'test@example.com', access_token: mockToken }]),
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result).toEqual({ isAuthenticated: true, isEasyAuthConfigured: true, error: null, username: 'John Doe' });
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/.auth/me', {
        method: 'GET',
        credentials: 'include',
      });
    });

    it('should return undefined username when name claim is missing', async () => {
      const mockToken = createMockJwt({ sub: 'user123', exp: 9999999999 });
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ provider_name: 'aad', user_id: 'test@example.com', access_token: mockToken }]),
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result).toEqual({ isAuthenticated: true, isEasyAuthConfigured: true, error: null, username: undefined });
    });

    it('should return false when user is not authenticated (empty array)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result).toEqual({ isAuthenticated: false, isEasyAuthConfigured: true, error: null, username: undefined });
    });

    it('should handle invalid JWT token gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ provider_name: 'aad', access_token: 'invalid-token' }]),
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result).toEqual({ isAuthenticated: true, isEasyAuthConfigured: true, error: null, username: undefined });
    });

    it('should handle missing access_token gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ provider_name: 'aad', user_id: 'test@example.com' }]),
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result).toEqual({ isAuthenticated: true, isEasyAuthConfigured: true, error: null, username: undefined });
    });

    it('should return false when response is not ok', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result.isAuthenticated).toBe(false);
      expect(result.isEasyAuthConfigured).toBe(true);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('Failed to fetch authentication status');
    });

    it('should return false on network error', async () => {
      const networkError = new Error('Network error');
      mockFetch.mockRejectedValueOnce(networkError);

      const result = await checkAuthStatus('https://example.com');

      expect(result).toEqual({ isAuthenticated: false, isEasyAuthConfigured: false, error: networkError });
    });

    it('should return isEasyAuthConfigured false when /.auth/me returns 404', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result).toEqual({ isAuthenticated: false, isEasyAuthConfigured: false, error: null });
    });
  });

  describe('openLoginPopup', () => {
    it('should open login popup with correct URL using signInEndpoint', () => {
      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      openLoginPopup({
        baseUrl: 'https://example.com',
        signInEndpoint: '/.auth/login/aad',
        postLoginRedirectUri: '/dashboard',
      });

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com/.auth/login/aad?post_login_redirect_uri=%2Fdashboard',
        'auth-login',
        'width=600,height=700,popup=true'
      );
    });

    it('should open login popup with different identity provider endpoint', () => {
      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      openLoginPopup({
        baseUrl: 'https://example.com',
        signInEndpoint: '/.auth/login/google',
      });

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com/.auth/login/google',
        'auth-login',
        'width=600,height=700,popup=true'
      );
    });

    it('should call onFailed when popup is blocked', () => {
      mockWindowOpen.mockReturnValueOnce(null);
      const onFailed = vi.fn();

      openLoginPopup({
        baseUrl: 'https://example.com',
        signInEndpoint: '/.auth/login/aad',
        onFailed,
      });

      expect(onFailed).toHaveBeenCalled();
    });

    it('should call onSuccess when login succeeds and popup closes', async () => {
      vi.useFakeTimers();

      const mockToken = createMockJwt({ name: 'Test User', sub: 'user123' });
      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ provider_name: 'aad', access_token: mockToken }]),
      });

      const onSuccess = vi.fn();

      openLoginPopup({
        baseUrl: 'https://example.com',
        signInEndpoint: '/.auth/login/aad',
        onSuccess,
      });

      // Simulate popup being closed after successful login
      mockPopup.closed = true;

      // First interval tick to detect popup closed
      await vi.advanceTimersByTimeAsync(500);
      // Wait for the 500ms delay after popup close
      await vi.advanceTimersByTimeAsync(500);
      // Allow promises to resolve
      await vi.runAllTimersAsync();

      expect(onSuccess).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('createUnauthorizedHandler', () => {
    it('should attempt token refresh on 401', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });
      const onRefreshSuccess = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onRefreshSuccess,
        onLoginRequired: vi.fn(),
      });

      await handler();

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/.auth/refresh', {
        method: 'GET',
        credentials: 'same-origin',
      });
      expect(onRefreshSuccess).toHaveBeenCalled();
    });

    it('should call onLoginRequired when refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });

      const onRefreshFailed = vi.fn();
      const onLoginRequired = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onRefreshFailed,
        onLoginRequired,
      });

      await handler();

      expect(onRefreshFailed).toHaveBeenCalled();
      expect(onLoginRequired).toHaveBeenCalled();
    });

    it('should call onLoginRequired when refresh throws an error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const onRefreshFailed = vi.fn();
      const onLoginRequired = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onRefreshFailed,
        onLoginRequired,
      });

      await handler();

      expect(onRefreshFailed).toHaveBeenCalled();
      expect(onLoginRequired).toHaveBeenCalled();
    });

    it('should reload page when refresh succeeds', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onLoginRequired: vi.fn(),
      });

      await handler();

      expect(mockLocation.reload).toHaveBeenCalled();
    });

    it('should prevent multiple simultaneous auth attempts', async () => {
      vi.useFakeTimers();

      let resolvePromise: (value: { ok: boolean }) => void;
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolvePromise = resolve;
          })
      );

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onLoginRequired: vi.fn(),
      });

      // Call handler multiple times
      const promise1 = handler();
      const promise2 = handler();
      const promise3 = handler();

      // Resolve the fetch
      resolvePromise!({ ok: true });

      await promise1;
      await promise2;
      await promise3;

      // Should only make one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });
});
