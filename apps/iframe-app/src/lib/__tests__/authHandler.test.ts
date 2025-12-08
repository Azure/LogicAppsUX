import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUnauthorizedHandler, getBaseUrl, openLoginPopup, checkAuthStatus } from '../authHandler';

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

  describe('checkAuthStatus', () => {
    it('should return true when user is authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([{ provider_name: 'aad', user_id: 'test@example.com' }]),
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('https://example.com/.auth/me', {
        method: 'GET',
        credentials: 'include',
      });
    });

    it('should return false when user is not authenticated', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      });

      const result = await checkAuthStatus('https://example.com');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkAuthStatus('https://example.com');

      expect(result).toBe(false);
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

      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([{ provider_name: 'aad' }]),
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
