import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFrameBlade } from '../useFrameBlade';

describe('useFrameBlade', () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let messageListeners: Array<(event: MessageEvent) => void> = [];

  beforeEach(() => {
    // Mock window.parent.postMessage
    mockPostMessage = vi.fn();
    window.parent = {
      postMessage: mockPostMessage,
    } as any;

    // Mock location.hash
    delete (window as any).location;
    (window as any).location = {
      ...window.location,
      hash: '#session123',
    };

    // Capture event listeners
    messageListeners = [];
    window.addEventListener = vi.fn((event, handler) => {
      if (event === 'message') {
        messageListeners.push(handler as any);
      }
    }) as any;

    window.removeEventListener = vi.fn((event, handler) => {
      if (event === 'message') {
        const index = messageListeners.indexOf(handler as any);
        if (index > -1) {
          messageListeners.splice(index, 1);
        }
      }
    }) as any;

    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();

    // Clear body classes
    document.body.className = '';

    // Clear message listeners
    messageListeners = [];
  });

  it('should be ready immediately when not enabled', () => {
    const { result } = renderHook(() =>
      useFrameBlade({
        enabled: false,
      })
    );

    expect(result.current.isReady).toBe(true);
  });

  it('should send ready message when enabled', () => {
    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
      })
    );

    expect(mockPostMessage).toHaveBeenCalledWith(
      {
        signature: 'FxFrameBlade',
        kind: 'ready',
        data: undefined,
        sessionId: 'session123',
      },
      'https://portal.azure.com'
    );
  });

  it('should send initialization complete after delay', () => {
    const { result } = renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
      })
    );

    expect(result.current.isReady).toBe(false);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      {
        signature: 'FxFrameBlade',
        kind: 'initializationcomplete',
        data: undefined,
        sessionId: 'session123',
      },
      'https://portal.azure.com'
    );

    expect(result.current.isReady).toBe(true);
  });

  it('should handle theme change messages', () => {
    const onThemeChange = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onThemeChange,
      })
    );

    // Clear any initial calls
    onThemeChange.mockClear();

    // Simulate theme change message
    const event = new MessageEvent('message', {
      origin: 'https://portal.azure.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'themeChanged',
        data: 'dark',
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onThemeChange).toHaveBeenCalledTimes(1);
    expect(onThemeChange).toHaveBeenCalledWith('dark');
    expect(document.body.classList.contains('fxs-theme-dark')).toBe(true);
  });

  it('should handle auth token messages', () => {
    const onAuthTokenReceived = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onAuthTokenReceived,
      })
    );

    // Simulate auth token message
    const event = new MessageEvent('message', {
      origin: 'https://portal.azure.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'authToken',
        data: 'test-auth-token',
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onAuthTokenReceived).toHaveBeenCalledWith('test-auth-token');
  });

  it('should ignore messages from untrusted origins', () => {
    const onThemeChange = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onThemeChange,
      })
    );

    // Simulate message from untrusted origin
    const event = new MessageEvent('message', {
      origin: 'https://untrusted.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'themeChanged',
        data: 'dark',
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onThemeChange).not.toHaveBeenCalled();
  });

  it('should ignore messages without Frame Blade signature', () => {
    const onThemeChange = vi.fn();

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
        onThemeChange,
      })
    );

    // Clear any initial calls
    onThemeChange.mockClear();

    // Simulate message without signature
    const event = new MessageEvent('message', {
      origin: 'https://portal.azure.com',
      data: {
        kind: 'themeChanged',
        data: 'dark',
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(onThemeChange).not.toHaveBeenCalled();
  });

  it('should handle frame title messages', () => {
    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
      })
    );

    // Simulate frame title message
    const event = new MessageEvent('message', {
      origin: 'https://portal.azure.com',
      data: {
        signature: 'FxFrameBlade',
        kind: 'frametitle',
        data: 'New Title',
      },
    });

    act(() => {
      messageListeners.forEach((listener) => listener(event));
    });

    expect(document.title).toBe('New Title');
    expect(mockPostMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'revealcontent',
      }),
      'https://portal.azure.com'
    );
  });

  it('should provide sendMessage function', () => {
    const { result } = renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
      })
    );

    act(() => {
      result.current.sendMessage('custom', { foo: 'bar' });
    });

    expect(mockPostMessage).toHaveBeenCalledWith(
      {
        signature: 'FxFrameBlade',
        kind: 'custom',
        data: { foo: 'bar' },
        sessionId: 'session123',
      },
      'https://portal.azure.com'
    );
  });

  it('should not send messages when disabled', () => {
    const { result } = renderHook(() =>
      useFrameBlade({
        enabled: false,
      })
    );

    mockPostMessage.mockClear();

    act(() => {
      result.current.sendMessage('custom', { foo: 'bar' });
    });

    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('should warn when no session ID found', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    Object.defineProperty(window.location, 'hash', {
      value: '',
      configurable: true,
    });

    renderHook(() =>
      useFrameBlade({
        enabled: true,
        trustedParentOrigin: 'https://portal.azure.com',
      })
    );

    expect(warnSpy).toHaveBeenCalledWith('No Frame Blade session ID found in URL hash');

    warnSpy.mockRestore();
  });
});
