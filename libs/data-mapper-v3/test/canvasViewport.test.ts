import { constrainZoomToWidth, fitLinkViewport, getCanvasBounds, zoomToCanvasBox } from '../webview/src/components/canvasViewport';

describe('canvas horizontal fit', () => {
  test('caps zoom so the content fits within the available width', () => {
    expect(constrainZoomToWidth(1200, 600, 2)).toBe(0.5);
    expect(constrainZoomToWidth(400, 600, 2)).toBe(1.5);
  });

  describe('rectangular box zoom', () => {
    const viewport = { width: 800, height: 600 };
    const content = { width: 1600, height: 1200 };
    const current = { zoom: 1, scrollLeft: 0, scrollTop: 0 };
    const limits = { minimumZoom: 0.1, maximumZoom: 2 };

    test('zooms into and centers the selected rectangle', () => {
      expect(zoomToCanvasBox({ x: 200, y: 150, width: 400, height: 300 }, viewport, content, current, limits)).toEqual({
        zoom: 2,
        scrollLeft: 400,
        scrollTop: 300,
      });
    });

    test('Shift-selection zooms out around the selected center', () => {
      expect(
        zoomToCanvasBox(
          { x: 200, y: 150, width: 400, height: 300 },
          viewport,
          content,
          { zoom: 2, scrollLeft: 400, scrollTop: 300 },
          limits,
          true
        )
      ).toEqual({ zoom: 1, scrollLeft: 0, scrollTop: 0 });
    });

    test('ignores accidental clicks and clamps zoom limits', () => {
      expect(zoomToCanvasBox({ x: 100, y: 100, width: 2, height: 2 }, viewport, content, current, limits)).toBe(current);
      expect(zoomToCanvasBox({ x: 390, y: 290, width: 10, height: 10 }, viewport, content, current, limits).zoom).toBe(2);
    });
  });

  test('preserves the requested zoom until layout dimensions are available', () => {
    expect(constrainZoomToWidth(0, 600, 1.5)).toBe(1.5);
    expect(constrainZoomToWidth(1200, 0, 1.5)).toBe(1.5);
  });
});

describe('selected connector viewport', () => {
  const current = { zoom: 1, scrollLeft: 0, scrollTop: 0 };

  test.each(
    [
      [{ x: 200, y: 200 }],
      [
        { x: 200, y: 200 },
        { x: 400, y: 300 },
      ],
    ].map((nodes) => ({ nodes }))
  )('does not disturb already-visible endpoints $nodes', ({ nodes }) => {
    expect(fitLinkViewport(nodes, getCanvasBounds(nodes), 800, 600, current)).toBe(current);
  });

  test.each(
    [
      [{ x: 2400, y: 1800 }],
      [
        { x: 0, y: 0 },
        { x: 4000, y: 3000 },
      ],
      [
        { x: 200, y: 200 },
        { x: 4000, y: 3000 },
      ],
      [
        { x: -1000, y: -500 },
        { x: 4000, y: 3000 },
      ],
      [
        { x: 200, y: 200 },
        { x: 100000, y: 80000 },
      ],
    ].map((nodes) => ({ nodes }))
  )('fits both functoid bodies and ports within the surface $nodes', ({ nodes }) => {
    const bounds = getCanvasBounds(nodes);
    const viewport = fitLinkViewport(nodes, bounds, 500, 350, current);
    for (const node of nodes) {
      const x = (node.x + bounds.originX) * viewport.zoom - viewport.scrollLeft;
      const y = (node.y + bounds.originY) * viewport.zoom - viewport.scrollTop;
      expect(x - 40 * viewport.zoom).toBeGreaterThanOrEqual(0);
      expect(x + 40 * viewport.zoom).toBeLessThanOrEqual(500);
      expect(y - 32 * viewport.zoom).toBeGreaterThanOrEqual(0);
      expect(y + 32 * viewport.zoom).toBeLessThanOrEqual(350);
    }
    expect(viewport.zoom).toBeGreaterThan(0);
    expect(viewport.zoom).toBeLessThanOrEqual(1);
  });

  test('zooms back in for a nearby off-screen selection without enlarging past 100%', () => {
    const nodes = [
      { x: 1500, y: 1200 },
      { x: 1600, y: 1250 },
    ];
    const viewport = fitLinkViewport(nodes, getCanvasBounds(nodes), 500, 350, {
      zoom: 0.1,
      scrollLeft: 500,
      scrollTop: 500,
    });
    expect(viewport.zoom).toBe(1);
  });

  test('schema-only links and a hidden surface do not change the viewport', () => {
    expect(fitLinkViewport([], getCanvasBounds([]), 500, 350, current)).toBe(current);
    expect(fitLinkViewport([{ x: 900, y: 900 }], getCanvasBounds([]), 0, 0, current)).toBe(current);
  });

  test('bounds include negative imported coordinates without modifying saved positions', () => {
    const nodes = [
      { x: -200, y: -300 },
      { x: 500, y: 600 },
    ];
    const snapshot = JSON.stringify(nodes);
    const bounds = getCanvasBounds(nodes);
    expect(bounds).toEqual({ originX: 280, originY: 380, width: 860, height: 1060 });
    fitLinkViewport(nodes, bounds, 500, 350, current);
    expect(JSON.stringify(nodes)).toBe(snapshot);
  });
});
