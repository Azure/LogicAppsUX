import { compactNodeMetrics, type CompactTitleLines } from './metrics';

const maxCachedTitles = 512;
const fallbackCharWidth = 7.4;
const { weight, size, family } = compactNodeMetrics.titleFont;
const measurements = new WeakMap<Document, (title: string) => number>();

function createTitleMeasurer(document: Document) {
  const widths = new Map<string, number>();
  const context = document.createElement('canvas').getContext('2d');
  if (!context) {
    return fallbackWidth;
  }
  context.font = `${weight} ${size}px ${family}`;
  // Font loading can replace fallback glyphs without changing the CSS font string.
  document.fonts?.addEventListener('loadingdone', () => widths.clear());
  return (title: string) => {
    const cached = widths.get(title);
    if (cached !== undefined) {
      widths.delete(title);
      widths.set(title, cached);
      return cached;
    }
    const width = context.measureText(title).width || fallbackWidth(title);
    if (widths.size === maxCachedTitles) {
      const oldest = widths.keys().next();
      if (!oldest.done) {
        widths.delete(oldest.value);
      }
    }
    widths.set(title, width);
    return width;
  };
}

const fallbackWidth = (title: string) => title.length * fallbackCharWidth;

/**
 * Hosts feed this result to both layout and the rendered card. Width measurements are shared
 * across reservations: a corner control reduces available space, not the width of the text.
 */
export function getCompactTitleLines(title: string | undefined, textEndReserve = 0): CompactTitleLines {
  if (!title) {
    return 1;
  }
  let measure = fallbackWidth;
  if (typeof document !== 'undefined') {
    measure = measurements.get(document) ?? createTitleMeasurer(document);
    measurements.set(document, measure);
  }
  return measure(title) > compactNodeMetrics.textWidth - textEndReserve ? 2 : 1;
}
