import { useLayoutEffect, useRef, useState } from 'react';

export const COLLAPSE_REVEAL_EXPAND_MS = 240;
export const COLLAPSE_REVEAL_COLLAPSE_MS = 180;

const easeInOutCubic = (value: number): number => (value < 0.5 ? 4 * value * value * value : 1 - (-2 * value + 2) ** 3 / 2);

const prefersReducedMotion = (root: Element | null): boolean =>
  typeof window !== 'undefined' &&
  ((typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) ||
    // Scoped preferences apply to ancestors only, never to an unrelated subtree elsewhere in the document.
    (root ?? document.documentElement).closest('[data-reduce-motion="true"]') != null);

const getDuration = (expanding: boolean, root: Element | null): number => {
  if (prefersReducedMotion(root)) {
    return 0;
  }
  return expanding ? COLLAPSE_REVEAL_EXPAND_MS : COLLAPSE_REVEAL_COLLAPSE_MS;
};

export interface CollapseRevealOptions {
  enabled?: boolean;
  expanded: boolean;
  collapsedHeight: number;
  /** Owning DOM root for scoped reduced motion; omission honors the document-level preference. */
  motionRoot?: () => Element | null;
  measureFull: () => number;
  apply: (visible: number, full: number) => void;
  clear: () => void;
}

export interface CollapseRevealState {
  mounted: boolean;
  open: boolean;
  hidden: boolean;
}

/**
 * Keeps the content mounted while animating and while settled-collapsed so callers can preserve local state,
 * retarget interrupts from the current height, and mark hidden content inert without unmounting descendants.
 */
export function useCollapseReveal(options: CollapseRevealOptions): CollapseRevealState {
  const { enabled = true, expanded } = options;
  const optionsRef = useRef(options);
  const stateRef = useRef({ frame: 0, timer: 0, visible: null as number | null, animating: false });
  const handledRef = useRef(expanded);
  const [open, setOpen] = useState(expanded);
  const [hidden, setHidden] = useState(!expanded);

  useLayoutEffect(() => {
    optionsRef.current = options;
  });

  useLayoutEffect(() => {
    const state = stateRef.current;
    const stop = () => {
      cancelAnimationFrame(state.frame);
      window.clearTimeout(state.timer);
      state.animating = false;
    };

    if (!enabled) {
      stop();
      state.visible = null;
      optionsRef.current.clear();
      setOpen(expanded);
      setHidden(!expanded);
      handledRef.current = expanded;
      return undefined;
    }

    if (handledRef.current === expanded) {
      return undefined;
    }

    handledRef.current = expanded;
    stop();

    const { collapsedHeight, measureFull, apply, clear } = optionsRef.current;
    const full = measureFull();
    const from = state.visible ?? (expanded ? collapsedHeight : full);
    const to = expanded ? full : collapsedHeight;
    const duration = getDuration(expanded, optionsRef.current.motionRoot?.() ?? null);
    let openFrame = 0;
    if (expanded) {
      setHidden(false);
      if (duration > 0) {
        openFrame = requestAnimationFrame(() => setOpen(true));
      } else {
        setOpen(true);
      }
    } else {
      setOpen(false);
    }

    const finish = () => {
      stop();
      state.visible = to;
      // Zero-duration and timer-fallback finishes must apply the final height, not just update hidden state.
      apply(to, full);
      if (expanded) {
        state.visible = null;
        clear();
      }
      setHidden(!expanded);
    };

    if (duration === 0) {
      finish();
      return () => cancelAnimationFrame(openFrame);
    }

    state.animating = true;
    const paint = (visible: number) => {
      state.visible = visible;
      apply(visible, full);
    };
    paint(from);
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      paint(from + (to - from) * easeInOutCubic(progress));
      if (progress < 1) {
        state.frame = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };
    state.frame = requestAnimationFrame(tick);
    state.timer = window.setTimeout(finish, duration + 100);
    return () => {
      cancelAnimationFrame(openFrame);
      stop();
    };
  }, [enabled, expanded]);

  return { mounted: true, open, hidden };
}
