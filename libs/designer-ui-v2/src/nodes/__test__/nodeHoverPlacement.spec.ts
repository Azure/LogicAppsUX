import { describe, expect, it } from 'vitest';
import { getClearHoverSide } from '../cards/nodeHoverPlacement';

const anchor = { left: 250, right: 350, top: 200, bottom: 250 };
const card = { width: 200, height: 100 };
const viewport = { width: 650, height: 500 };
const rightSibling = { left: 400, right: 500, top: 200, bottom: 250 };
const leftSibling = { left: 100, right: 200, top: 200, bottom: 250 };

describe('node hover placement', () => {
  it('flips away from a parallel sibling in both LTR and RTL', () => {
    expect(getClearHoverSide(anchor, card, viewport, [rightSibling], false)).toBe('before');
    expect(getClearHoverSide(anchor, card, viewport, [leftSibling], true)).toBe('before');
  });

  it('uses a vertical gap when the viewport edge and neighboring card block the sides', () => {
    expect(getClearHoverSide(anchor, card, { ...viewport, width: 450 }, [leftSibling], false)).toBe('below');
  });

  it('delegates to the viewport-aware fallback if no clear placement fits', () => {
    expect(getClearHoverSide(anchor, card, viewport, [{ left: 0, top: 0, right: 650, bottom: 500 }], false)).toBeUndefined();
  });
});
