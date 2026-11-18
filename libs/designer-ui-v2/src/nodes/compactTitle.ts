import { compactNodeMetrics, type CompactTitleLines } from './metrics';

const compactTitleLineCache = new Map<string, CompactTitleLines>();
let measureContext: CanvasRenderingContext2D | null | undefined;
const compactTitleFontFamily =
  "'Segoe UI', 'Segoe UI Web (West European)', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', sans-serif";
// Average 14px semibold Segoe UI advance; used when canvas text metrics are unavailable (SSR, jsdom).
const fallbackCharWidth = 7.4;

const measureTitleWidth = (title: string): number => {
  if (measureContext === undefined) {
    try {
      measureContext = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d');
    } catch {
      measureContext = null;
    }
    if (measureContext) {
      const { weight, size } = compactNodeMetrics.titleFont;
      measureContext.font = `${weight} ${size}px ${compactTitleFontFamily}`;
    }
  }
  const measured = measureContext?.measureText(title).width;
  return typeof measured === 'number' && measured > 0 ? measured : title.length * fallbackCharWidth;
};

/**
 * Hosts compute this once per title and feed the same value to layout (height) and the card (line clamp),
 * so a misestimate can only cost an ellipsis or spare space, never a handle/edge misalignment.
 */
export const getCompactTitleLines = (title: string | undefined, textEndReserve = 0): CompactTitleLines => {
  if (!title) {
    return 1;
  }
  // The reserve narrows the column (e.g. a host's corner control), so it is part of the cache identity.
  const cacheKey = `${textEndReserve}|${title}`;
  const cached = compactTitleLineCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  const lines: CompactTitleLines = measureTitleWidth(title) > compactNodeMetrics.textWidth - textEndReserve ? 2 : 1;
  compactTitleLineCache.set(cacheKey, lines);
  return lines;
};
