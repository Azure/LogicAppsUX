import { fitLinkViewport, getCanvasBounds } from '../webview/src/components/canvasViewport';

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
