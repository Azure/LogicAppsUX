import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { openPopupWindow, isPopupSupported } from './popup-window';

describe('popup-window', () => {
  describe('isPopupSupported', () => {
    it('should return true in a browser environment', () => {
      expect(isPopupSupported()).toBe(true);
    });
  });

  describe('openPopupWindow', () => {
    let mockPopup: any;
    let originalOpen: any;

    beforeEach(() => {
      // Mock popup window
      mockPopup = {
        closed: false,
        focus: vi.fn(),
        close: vi.fn(),
      };

      // Store original window.open
      originalOpen = window.open;

      // Mock window.open
      window.open = vi.fn().mockReturnValue(mockPopup);

      // Mock window properties
      Object.defineProperty(window, 'screenX', { value: 100, configurable: true });
      Object.defineProperty(window, 'screenY', { value: 100, configurable: true });
      Object.defineProperty(window, 'outerWidth', { value: 1920, configurable: true });
      Object.defineProperty(window, 'outerHeight', { value: 1080, configurable: true });
    });

    afterEach(() => {
      // Restore original window.open
      window.open = originalOpen;
      vi.clearAllTimers();
    });

    it('should open a popup window with default options', () => {
      openPopupWindow('https://example.com/auth');

      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/auth',
        'a2a-auth',
        expect.stringContaining('width=600')
      );
      expect(mockPopup.focus).toHaveBeenCalled();
    });

    it('should open a popup window with custom options', () => {
      openPopupWindow('https://example.com/auth', 'custom-window', {
        width: 800,
        height: 900,
        left: 200,
        top: 300,
      });

      expect(window.open).toHaveBeenCalledWith(
        'https://example.com/auth',
        'custom-window',
        expect.stringContaining('width=800,height=900,left=200,top=300')
      );
    });

    it('should check if popup is closed immediately', async () => {
      vi.useFakeTimers();

      const promise = openPopupWindow('https://example.com/auth');

      // Mark popup as closed
      mockPopup.closed = true;

      // Advance timers to trigger the check
      vi.advanceTimersByTime(100);
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toEqual({ closed: true });

      vi.useRealTimers();
    });

    it('should resolve when popup is closed after some time', async () => {
      vi.useFakeTimers();

      const promise = openPopupWindow('https://example.com/auth');

      // Simulate popup closing after 200ms
      setTimeout(() => {
        mockPopup.closed = true;
      }, 200);

      // Advance timers
      vi.advanceTimersByTime(200);
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toEqual({ closed: true });

      vi.useRealTimers();
    });

    it('should throw error when popup blocker prevents opening', async () => {
      window.open = vi.fn().mockReturnValue(null);

      await expect(openPopupWindow('https://example.com/auth')).rejects.toThrow(
        'Failed to open popup window'
      );
    });

    it('should timeout after 10 minutes and close popup', async () => {
      vi.useFakeTimers();

      const promise = openPopupWindow('https://example.com/auth');

      // Advance timers by 10 minutes
      vi.advanceTimersByTime(10 * 60 * 1000);
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toEqual({
        closed: true,
        error: expect.objectContaining({
          message: 'Authentication timeout - window was closed automatically',
        }),
      });
      expect(mockPopup.close).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('should handle cross-origin errors gracefully', async () => {
      vi.useFakeTimers();

      // Make popup.closed throw on subsequent accesses (simulating cross-origin navigation)
      // First check should succeed (line 62), then throw errors in the interval (line 69)
      let accessCount = 0;
      Object.defineProperty(mockPopup, 'closed', {
        get: () => {
          accessCount++;
          // First access (immediate check) should return false to not close immediately
          if (accessCount === 1) {
            return false;
          }
          // Next few accesses should throw (simulating cross-origin)
          if (accessCount < 5) {
            throw new Error('Cross-origin');
          }
          // Finally return true to close
          return true;
        },
      });

      const promise = openPopupWindow('https://example.com/auth');

      // Advance timers to trigger multiple checks
      vi.advanceTimersByTime(500);
      await vi.runAllTimersAsync();

      const result = await promise;
      expect(result).toEqual({ closed: true });

      vi.useRealTimers();
    });
  });
});
