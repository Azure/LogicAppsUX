import { expect, it, vi } from 'vitest';

it('reuses measurements across reserves, evicts old titles and remeasures after fonts load', async () => {
  const measureText = vi.fn(() => ({ width: 130 }) as TextMetrics);
  const canvas = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText } as CanvasRenderingContext2D);
  const fonts = new EventTarget();
  const previous = Object.getOwnPropertyDescriptor(document, 'fonts');
  Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
  try {
    const { getCompactTitleLines } = await import('../compactTitle');
    expect(getCompactTitleLines('Old title')).toBe(1);
    expect(getCompactTitleLines('Old title', 20)).toBe(2);
    expect(measureText).toHaveBeenCalledTimes(1);

    for (let index = 0; index < 512; index++) {
      getCompactTitleLines(`Operation ${index}`);
    }
    measureText.mockClear();
    getCompactTitleLines('Old title');
    expect(measureText).toHaveBeenCalledOnce();

    fonts.dispatchEvent(new Event('loadingdone'));
    measureText.mockReturnValue({ width: 160 } as TextMetrics);
    expect(getCompactTitleLines('Old title')).toBe(2);
  } finally {
    canvas.mockRestore();
    if (previous) {
      Object.defineProperty(document, 'fonts', previous);
    } else {
      Reflect.deleteProperty(document, 'fonts');
    }
  }
});
