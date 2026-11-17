import { createElement, StrictMode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { COLLAPSE_REVEAL_COLLAPSE_MS, COLLAPSE_REVEAL_EXPAND_MS, useCollapseReveal } from '../primitives/collapseReveal';

const originalRequestAnimationFrame = window.requestAnimationFrame;
const originalCancelAnimationFrame = window.cancelAnimationFrame;
const originalMatchMedia = window.matchMedia;

describe('useCollapseReveal', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    window.matchMedia = originalMatchMedia;
    document.documentElement.removeAttribute('data-reduce-motion');
    document.querySelector('[data-reduce-motion="true"]')?.removeAttribute('data-reduce-motion');
  });

  it('uses the canonical reveal timing constants', () => {
    expect(COLLAPSE_REVEAL_EXPAND_MS).toBe(240);
    expect(COLLAPSE_REVEAL_COLLAPSE_MS).toBe(180);
  });

  it('animates open/close, keeps content mounted, and settles hidden collapsed content', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => window.clearTimeout(id)) as typeof window.cancelAnimationFrame;
    const apply = vi.fn();
    const clear = vi.fn();
    const { result, rerender } = renderHook(
      ({ expanded }) =>
        useCollapseReveal({
          expanded,
          collapsedHeight: 0,
          measureFull: () => 200,
          apply,
          clear,
        }),
      { initialProps: { expanded: false } }
    );
    expect(result.current.mounted).toBe(true);
    expect(result.current.hidden).toBe(true);
    act(() => rerender({ expanded: true }));
    expect(result.current.hidden).toBe(false);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.open).toBe(true);
    expect(result.current.hidden).toBe(false);
    expect(clear).toHaveBeenCalled();
    act(() => rerender({ expanded: false }));
    expect(result.current.open).toBe(false);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.hidden).toBe(true);
    expect(apply).toHaveBeenCalled();
  });

  it('retargets interrupted animations from the current visible height', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => window.clearTimeout(id)) as typeof window.cancelAnimationFrame;
    const apply = vi.fn();
    const { rerender } = renderHook(
      ({ expanded }) =>
        useCollapseReveal({
          expanded,
          collapsedHeight: 0,
          measureFull: () => 200,
          apply,
          clear: vi.fn(),
        }),
      { initialProps: { expanded: false } }
    );
    act(() => rerender({ expanded: true }));
    act(() => vi.advanceTimersByTime(80));
    const beforeInterrupt = apply.mock.lastCall![0];
    expect(beforeInterrupt).toBeGreaterThan(0);
    expect(beforeInterrupt).toBeLessThan(200);
    act(() => rerender({ expanded: false }));
    expect(apply.mock.lastCall![0]).toBe(beforeInterrupt);
    act(() => vi.advanceTimersByTime(500));
    const visibleHeights = apply.mock.calls.map(([visible]) => visible as number);
    expect(visibleHeights.length).toBeGreaterThan(1);
    expect(visibleHeights.some((value) => value > 0 && value < 200)).toBe(true);
  });

  it('uses zero-duration transitions when reduced motion is requested', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    window.requestAnimationFrame = ((callback: FrameRequestCallback) =>
      window.setTimeout(() => callback(performance.now()), 16)) as typeof window.requestAnimationFrame;
    window.cancelAnimationFrame = ((id: number) => window.clearTimeout(id)) as typeof window.cancelAnimationFrame;
    window.matchMedia = vi.fn().mockImplementation(
      (query: string) =>
        ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
        }) as MediaQueryList
    );
    const clear = vi.fn();
    const apply = vi.fn();
    const { result, rerender } = renderHook(
      ({ expanded }) =>
        useCollapseReveal({
          expanded,
          collapsedHeight: 0,
          measureFull: () => 120,
          apply,
          clear,
        }),
      { initialProps: { expanded: false } }
    );
    act(() => rerender({ expanded: true }));
    expect(result.current.hidden).toBe(false);
    expect(clear).toHaveBeenCalled();
    expect(result.current.open).toBe(true);
    act(() => rerender({ expanded: false }));
    expect(result.current.hidden).toBe(true);
    expect(apply).toHaveBeenLastCalledWith(0, 120);
  });

  it.each([
    { expanded: true, duration: 180 },
    { expanded: false, duration: 240 },
  ])('settles only at the $duration ms boundary and cleans up the interrupted $expanded transition', ({ expanded, duration }) => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 16);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    const apply = vi.fn();
    const clear = vi.fn();
    const { result, rerender, unmount } = renderHook(
      (props) =>
        useCollapseReveal({
          expanded: props.expanded,
          collapsedHeight: 0,
          measureFull: () => 200,
          apply,
          clear,
        }),
      { initialProps: { expanded }, wrapper: ({ children }) => createElement(StrictMode, null, children) }
    );
    expect(apply).not.toHaveBeenCalled();
    expect(clear).not.toHaveBeenCalled();
    act(() => rerender({ expanded: !expanded }));
    expect(result.current.open).toBe(false);
    expect(result.current.mounted).toBe(true);
    act(() => vi.advanceTimersByTime(16));
    expect(result.current.open).toBe(!expanded);
    act(() => vi.advanceTimersByTime(duration - 17));
    expect(clear).not.toHaveBeenCalled();
    expect(result.current.hidden).toBe(false);
    act(() => vi.advanceTimersByTime(17));
    expect(result.current.hidden).toBe(expanded);
    expect(apply.mock.lastCall![0]).toBe(expanded ? 0 : 200);
    act(() => rerender({ expanded }));
    const callsBeforeUnmount = apply.mock.calls.length;
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(apply).toHaveBeenCalledTimes(callsBeforeUnmount);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses the latest measured height/callbacks and clears geometry when motion is disabled mid-collapse', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(performance.now()), 16);
    window.cancelAnimationFrame = (id) => window.clearTimeout(id);
    const originalApply = vi.fn();
    const latestApply = vi.fn();
    const clear = vi.fn();
    const { rerender, result } = renderHook(
      ({ expanded, enabled, full, apply }) =>
        useCollapseReveal({
          expanded,
          enabled,
          collapsedHeight: 0,
          measureFull: () => full,
          apply,
          clear,
        }),
      { initialProps: { expanded: true, enabled: true, full: 200, apply: originalApply } }
    );
    act(() => rerender({ expanded: true, enabled: true, full: 300, apply: latestApply }));
    act(() => rerender({ expanded: false, enabled: true, full: 300, apply: latestApply }));
    expect(originalApply).not.toHaveBeenCalled();
    expect(latestApply).toHaveBeenLastCalledWith(300, 300);
    act(() => vi.advanceTimersByTime(96));
    act(() => rerender({ expanded: false, enabled: false, full: 300, apply: latestApply }));
    expect(clear).toHaveBeenCalledOnce();
    expect(result.current.hidden).toBe(true);
    expect(result.current.open).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('honors the document reduced-motion flag even without matchMedia', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    document.documentElement.setAttribute('data-reduce-motion', 'true');
    const apply = vi.fn();
    const { result, rerender } = renderHook(
      ({ expanded }) => useCollapseReveal({ expanded, collapsedHeight: 0, measureFull: () => 200, apply, clear: vi.fn() }),
      { initialProps: { expanded: true } }
    );
    act(() => rerender({ expanded: false }));
    expect(result.current.hidden).toBe(true);
    expect(apply).toHaveBeenLastCalledWith(0, 200);
  });

  it('applies the settled height when animation frames are suspended and the safety timer finishes', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    window.requestAnimationFrame = vi.fn(() => 1);
    window.cancelAnimationFrame = vi.fn();
    const apply = vi.fn();
    const { result, rerender } = renderHook(
      ({ expanded }) => useCollapseReveal({ expanded, collapsedHeight: 0, measureFull: () => 200, apply, clear: vi.fn() }),
      { initialProps: { expanded: true } }
    );
    act(() => rerender({ expanded: false }));
    expect(apply).toHaveBeenLastCalledWith(200, 200);
    act(() => vi.advanceTimersByTime(279));
    expect(result.current.hidden).toBe(false);
    act(() => vi.advanceTimersByTime(1));
    expect(result.current.hidden).toBe(true);
    expect(apply).toHaveBeenLastCalledWith(0, 200);
  });
});
