import { useCallback, useState } from 'react';
import type { FocusEvent } from 'react';

export interface EdgeActiveStateResult {
  isHovered: boolean;
  isActive: boolean;
  reset: () => void;
  wrapperProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
    onFocus: (event: FocusEvent<HTMLElement>) => void;
    onBlur: (event: FocusEvent<HTMLElement>) => void;
  };
  lineProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

/** Element-local edge activation; hosts attach these handlers to the line and its controls. */
export function useEdgeActiveState(): EdgeActiveStateResult {
  const [isHovered, setIsHovered] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const onMouseEnter = useCallback(() => setIsHovered(true), []);
  const onMouseLeave = useCallback(() => setIsHovered(false), []);
  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    // Fluent's focus-ring signal excludes click focus, which must not latch the edge on.
    setIsKeyboardFocused(event.target.hasAttribute('data-fui-focus-visible'));
  }, []);
  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    // Moving between controls within this edge is not an exit from the active region.
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setIsKeyboardFocused(false);
    }
  }, []);
  // Opening a menu clears pointer reveal, but keyboard focus must remain visible until blur.
  const reset = useCallback(() => setIsHovered(false), []);

  return {
    isHovered,
    isActive: isHovered || isKeyboardFocused,
    reset,
    wrapperProps: { onMouseEnter, onMouseLeave, onFocus, onBlur },
    lineProps: { onMouseEnter, onMouseLeave },
  };
}
