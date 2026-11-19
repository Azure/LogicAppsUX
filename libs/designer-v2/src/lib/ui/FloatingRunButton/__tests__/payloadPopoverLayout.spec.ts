import { describe, expect, it, vi } from 'vitest';
import { PAYLOAD_POPOVER_TOP_CLEARANCE, getPayloadPopoverMaxHeight } from '../payloadPopoverLayout';

describe('payload popover layout', () => {
  it('limits the popover to the space below the view switcher', () => {
    const surface = document.createElement('div');
    const anchor = document.createElement('button');
    surface.appendChild(anchor);
    document.body.appendChild(surface);

    vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
      top: 120,
      bottom: 800,
      left: 0,
      right: 400,
      width: 400,
      height: 680,
      x: 0,
      y: 120,
      toJSON: () => ({}),
    });
    vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({
      top: 760,
      bottom: 800,
      left: 180,
      right: 220,
      width: 40,
      height: 40,
      x: 180,
      y: 760,
      toJSON: () => ({}),
    });
    Object.defineProperty(surface, 'clientHeight', { configurable: true, value: 680 });
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      overflow: 'hidden',
      overflowY: 'hidden',
      position: 'relative',
    } as CSSStyleDeclaration);

    expect(getPayloadPopoverMaxHeight(anchor)).toBe(760 - 120 - PAYLOAD_POPOVER_TOP_CLEARANCE);

    surface.remove();
    vi.restoreAllMocks();
  });

  it('does not constrain the popover when the surface cannot be measured', () => {
    expect(getPayloadPopoverMaxHeight(null)).toBeUndefined();
  });
});
