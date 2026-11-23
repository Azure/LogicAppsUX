import { nodeMetrics } from '../metrics';

type Rect = Pick<DOMRectReadOnly, 'left' | 'right' | 'top' | 'bottom'>;
type Size = Pick<DOMRectReadOnly, 'width' | 'height'>;
type Side = 'after' | 'before' | 'below' | 'above';

const intersects = (a: Rect, b: Rect) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

/** Leave fallback to Fluent when none of the preferred placements fits without covering canvas content. */
export function getClearHoverSide(anchor: Rect, card: Size, viewport: Size, obstacles: Rect[], rtl: boolean): Side | undefined {
  const gap = nodeMetrics.hoverCard.offset;
  const right = anchor.right + gap;
  const left = anchor.left - gap - card.width;
  const start = rtl ? anchor.right - card.width : anchor.left;
  const candidates: [Side, number, number][] = [
    ['after', rtl ? left : right, anchor.top],
    ['before', rtl ? right : left, anchor.top],
    ['below', start, anchor.bottom + gap],
    ['above', start, anchor.top - gap - card.height],
  ];
  return candidates.find(([, left, top]) => {
    const box = { left, top, right: left + card.width, bottom: top + card.height };
    return (
      box.left >= 0 &&
      box.top >= 0 &&
      box.right <= viewport.width &&
      box.bottom <= viewport.height &&
      !obstacles.some((obstacle) => intersects(box, obstacle))
    );
  })?.[0];
}
