import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createUnauthorizedHandler, getBaseUrl } from '../authHandler';

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
      const agentCardUrl =
        'https://app.example.com/api/agents/assistant/.well-known/agent-card.json';
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

    it('should open logout popup when refresh fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const mockPopup = { closed: false, close: vi.fn(), location: { href: '' } };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      const onRefreshFailed = vi.fn();
      const onLogoutComplete = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onRefreshFailed,
        onLogoutComplete,
      });

      await handler();

      expect(onRefreshFailed).toHaveBeenCalled();
      expect(mockWindowOpen).toHaveBeenCalledWith(
        'https://example.com/.auth/logout',
        'auth-logout',
        'width=600,height=700,popup=true'
      );

      // Simulate popup being closed
      mockPopup.closed = true;

      // Wait for interval to detect closure
      await new Promise((resolve) => setTimeout(resolve, 600));

      expect(onLogoutComplete).toHaveBeenCalled();
      expect(mockLocation.reload).toHaveBeenCalled();
    });

    it('should detect logout completion via URL change', async () => {
      vi.useFakeTimers();

      mockFetch.mockResolvedValueOnce({ ok: false });
      const mockPopup = {
        closed: false,
        close: vi.fn(),
        location: { href: 'https://example.com/.auth/logout' },
      };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      const onLogoutComplete = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onLogoutComplete,
      });

      await handler();

      // Change popup URL to completion URL
      mockPopup.location.href = 'https://example.com/.auth/logout/complete';

      // Advance timers to trigger interval check
      vi.advanceTimersByTime(600);

      expect(mockPopup.close).toHaveBeenCalled();
      expect(onLogoutComplete).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should redirect directly if popup is blocked', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      mockWindowOpen.mockReturnValueOnce(null);

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
      });

      await handler();

      expect(mockLocation.href).toBe('https://example.com/.auth/logout');
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      const mockPopup = { closed: false, close: vi.fn() };
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
      mockFetch.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 100))
      );

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

    it('should handle cross-origin errors when checking popup URL', async () => {
      vi.useFakeTimers();

      mockFetch.mockResolvedValueOnce({ ok: false });
      const mockPopup = {
        closed: false,
        close: vi.fn(),
        get location() {
          throw new Error('Cross-origin access denied');
        },
      };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      const onLogoutComplete = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onLogoutComplete,
      });

      await handler();

      // Simulate popup being closed
      mockPopup.closed = true;

      // Advance timers to trigger interval check
      vi.advanceTimersByTime(600);

      expect(onLogoutComplete).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should timeout after 5 minutes', async () => {
      vi.useFakeTimers();

      mockFetch.mockResolvedValueOnce({ ok: false });
      const mockPopup = { closed: false, close: vi.fn() };
      mockWindowOpen.mockReturnValueOnce(mockPopup);

      const onLogoutComplete = vi.fn();

      const handler = createUnauthorizedHandler({
        baseUrl: 'https://example.com',
        onLogoutComplete,
      });

      await handler();

      // Advance time by 5 minutes
      vi.advanceTimersByTime(5 * 60 * 1000);

      expect(mockPopup.close).toHaveBeenCalled();
      expect(onLogoutComplete).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
