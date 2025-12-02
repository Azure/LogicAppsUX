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
        credentials: 'same-origin',
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
    it('should open login popup with correct URL', () => {
      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      openLoginPopup({
        baseUrl: 'https://example.com',
        postLoginRedirectUri: '/dashboard',
      });

      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com/.auth/login/aad?post_login_redirect_uri=%2Fdashboard',
        'auth-login',
        'width=600,height=700,popup=true'
      );
    });

    it('should call onFailed when popup is blocked', () => {
      mockWindowOpen.mockReturnValueOnce(null);
      const onFailed = vi.fn();

      openLoginPopup({
        baseUrl: 'https://example.com',
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
        onSuccess,
      });

      // Simulate popup being closed after successful login
      mockPopup.closed = true;

      // Advance timers to trigger interval check
      await vi.advanceTimersByTimeAsync(600);

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
      });

      await handler();

      expect(mockFetch).toHaveBeenCalledWith('https://example.com/.auth/refresh', {
        method: 'GET',
        credentials: 'same-origin',
      });
      expect(onRefreshSuccess).toHaveBeenCalled();
    });

    it('should open login popup when refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      const onRefreshFailed = vi.fn();
      const onLoginSuccess = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onRefreshFailed,
        onLoginSuccess,
      });

      await handler();

      expect(onRefreshFailed).toHaveBeenCalled();
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com/.auth/login/aad?post_login_redirect_uri=%2F',
        'auth-login',
        'width=600,height=700,popup=true'
      );
    });

    it('should call onLoginSuccess when login popup succeeds', async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({ ok: false }) // refresh fails
        .mockResolvedValueOnce({
          // checkAuthStatus succeeds
          ok: true,
          json: () => Promise.resolve([{ provider_name: 'aad' }]),
        });

      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      const onLoginSuccess = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onLoginSuccess,
      });

      await handler();

      // Simulate popup being closed after successful login
      mockPopup.closed = true;

      // Advance timers to trigger interval check
      await vi.advanceTimersByTimeAsync(600);

      expect(onLoginSuccess).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should fall back to logout when login fails', async () => {
      vi.useFakeTimers();

      mockFetch
        .mockResolvedValueOnce({ ok: false }) // refresh fails
        .mockResolvedValueOnce({
          // checkAuthStatus fails (not authenticated)
          ok: true,
          json: () => Promise.resolve([]),
        });

      const mockLoginPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      const mockLogoutPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockLoginPopup).mockReturnValueOnce(mockLogoutPopup);

      const onLoginFailed = vi.fn();
      const onLogoutComplete = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onLoginFailed,
        onLogoutComplete,
      });

      await handler();

      // Simulate login popup being closed without success
      mockLoginPopup.closed = true;

      // Advance timers to trigger interval check and auth status check
      await vi.advanceTimersByTimeAsync(600);

      expect(onLoginFailed).toHaveBeenCalled();

      // Now logout popup should be opened
      expect(mockWindowOpen).toHaveBeenCalledTimes(2);
      expect(mockWindowOpen).toHaveBeenLastCalledWith('https://example.com/.auth/logout', 'auth-logout', 'width=600,height=700,popup=true');

      // Simulate logout popup being closed
      mockLogoutPopup.closed = true;

      await vi.advanceTimersByTimeAsync(600);

      expect(onLogoutComplete).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should redirect directly if popup is blocked', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      mockWindowOpen.mockReturnValueOnce(null);

      const onLoginFailed = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onLoginFailed,
      });

      await handler();

      expect(onLoginFailed).toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      const onRefreshFailed = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onRefreshFailed,
      });

      await handler();

      expect(onRefreshFailed).toHaveBeenCalled();
      expect(mockWindowOpen).toHaveBeenCalled();
    });

    it('should prevent multiple simultaneous auth attempts', async () => {
      mockFetch.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100)));

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
      });

      // Call handler multiple times
      const promise1 = handler();
      const promise2 = handler();
      const promise3 = handler();

      await Promise.all([promise1, promise2, promise3]);

      // Should only make one fetch call
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
