import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useInitialMountSettled', () => {
  it('shares one idle callback across cards and keeps later mounts settled', async () => {
    const callbacks: (() => void)[] = [];
    const requestIdle = vi.fn((callback: () => void) => {
      callbacks.push(callback);
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', requestIdle);
    const { useInitialMountSettled } = await import('../useInitialMountSettled');
    const first = renderHook(useInitialMountSettled);
    const second = renderHook(useInitialMountSettled);
    const removed = renderHook(useInitialMountSettled);
    removed.unmount();

    expect(first.result.current).toBe(false);
    expect(second.result.current).toBe(false);
    expect(requestIdle).toHaveBeenCalledTimes(1);

    act(() => callbacks[0]());

    expect(first.result.current).toBe(true);
    expect(second.result.current).toBe(true);
    first.unmount();
    second.unmount();
    const later = renderHook(useInitialMountSettled);
    expect(later.result.current).toBe(true);
    expect(requestIdle).toHaveBeenCalledTimes(1);
  });

  it('defers optional card work with a timer when idle callbacks are unavailable', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('requestIdleCallback', undefined);
    const { useInitialMountSettled } = await import('../useInitialMountSettled');
    const hook = renderHook(useInitialMountSettled);

    expect(hook.result.current).toBe(false);

    act(() => vi.runOnlyPendingTimers());

    expect(hook.result.current).toBe(true);
  });
});
