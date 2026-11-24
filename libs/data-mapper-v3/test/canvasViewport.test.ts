import { describe, test, expect } from 'vitest';
import { FunctoidCategory, LinkEndpointType } from '../src/model/mapModel';
import { constrainZoomToWidth, fitLinkViewport, getCanvasBounds, zoomToCanvasBox } from '../webview/src/components/canvasViewport';
import { type FunctoidLayoutInput, layoutFunctoids } from '../webview/src/components/functoidAutoLayout';

describe('functoid auto-layout completeness', () => {
  function makeInput(ids: string[], edges: [string, string][] = []): FunctoidLayoutInput {
    return {
      functoids: ids.map((id, index) => ({
        id,
        functoidId: 107,
        category: FunctoidCategory.String,
        name: 'String Concatenate',
        x: 100,
        y: 100 + index * 100,
        inputLinks: [],
        outputLinks: [],
        parameters: [],
      })),
      links: edges.map(([sourceId, targetId]) => ({
        id: `${sourceId}-${targetId}`,
        sourceId,
        targetId,
        sourceType: LinkEndpointType.Functoid,
        targetType: LinkEndpointType.Functoid,
      })),
      positions: new Map(),
      offsetY: 0,
      scrollLeft: 0,
      scrollTop: 0,
      layoutLeft: 0,
      layoutTop: 0,
      zoom: 1,
      viewportWidth: 800,
      viewportHeight: 600,
      functoidWidth: 72,
      functoidHeight: 26,
      gridSize: 10,
      padding: 24,
      snap: (value) => Math.max(0, Math.round(value / 10) * 10),
    };
  }

  function expectCompleteLayout(input: FunctoidLayoutInput): ReturnType<typeof layoutFunctoids> {
    const before = { ...input, ...structuredClone({ functoids: input.functoids, links: input.links, positions: input.positions }) };
    const result = layoutFunctoids(input);
    expect([...result.keys()].sort()).toEqual(input.functoids.map((functoid) => functoid.id).sort());
    const points = [...result.values()];
    for (const [index, point] of points.entries()) {
      expect(Number.isFinite(point.x) && Number.isFinite(point.y)).toBe(true);
      expect(point.x % input.gridSize).toBe(0);
      expect(point.y % input.gridSize).toBe(0);
      for (const other of points.slice(index + 1)) {
        expect(Math.abs(point.x - other.x) >= input.functoidWidth || Math.abs(point.y - other.y) >= input.functoidHeight).toBe(true);
      }
    }
    expect(input).toEqual(before);
    return result;
  }

  test('returns an empty result for an empty page', () => {
    expect(expectCompleteLayout(makeInput([])).size).toBe(0);
  });

  test('places a single unanchored functoid', () => {
    expectCompleteLayout(makeInput(['single']));
  });

  test('places every diamond dependency and disconnected node without changing the input', () => {
    const input = makeInput(
      ['first', 'left', 'right', 'last', 'isolated'],
      [
        ['first', 'left'],
        ['first', 'right'],
        ['left', 'last'],
        ['right', 'last'],
      ]
    );
    const result = expectCompleteLayout(input);
    for (const link of input.links) {
      expect(result.get(link.sourceId)!.x).toBeLessThan(result.get(link.targetId)!.x);
    }
  });

  test('handles cycles, self-links, dangling endpoints and unavailable schema positions', () => {
    const input = makeInput(
      ['first', 'second', 'self'],
      [
        ['first', 'second'],
        ['second', 'first'],
        ['self', 'self'],
        ['missing-source', 'first'],
        ['second', 'missing-target'],
      ]
    );
    input.links.push({
      id: 'missing-schema-position',
      sourceId: 'schema',
      sourcePath: '/Root/Id',
      sourceType: LinkEndpointType.SchemaNode,
      targetId: 'first',
      targetType: LinkEndpointType.Functoid,
    });
    expectCompleteLayout(input);
  });

  test('converts schema anchors using zoom, offsets, scroll and layout origin', () => {
    const input = makeInput(['first', 'second']);
    Object.assign(input, { zoom: 2, offsetY: 100, scrollTop: 40, layoutLeft: 200, layoutTop: 100 });
    input.links.push(
      {
        id: 'source-anchor',
        sourceId: 'source',
        sourcePath: '/Root/Id',
        sourceType: LinkEndpointType.SchemaNode,
        targetId: 'first',
        targetType: LinkEndpointType.Functoid,
      },
      {
        id: 'target-anchor',
        sourceId: 'second',
        sourceType: LinkEndpointType.Functoid,
        targetId: 'target',
        targetPath: '/Result/Id',
        targetType: LinkEndpointType.SchemaNode,
      }
    );
    input.positions.set('src:/Root/Id', { x: 0, y: 300 });
    input.positions.set('tgt:/Result/Id', { x: 0, y: 600 });
    expect(expectCompleteLayout(input)).toEqual(
      new Map([
        ['first', { x: 300, y: 120 }],
        ['second', { x: 300, y: 270 }],
      ])
    );
  });

  test('propagates a schema anchor through a reverse-ordered dependency chain', () => {
    const input = makeInput(
      ['tail', 'middle', 'head'],
      [
        ['head', 'middle'],
        ['middle', 'tail'],
      ]
    );
    input.links.push({
      id: 'source-anchor',
      sourceId: 'source',
      sourcePath: '/Root/Id',
      sourceType: LinkEndpointType.SchemaNode,
      targetId: 'head',
      targetType: LinkEndpointType.Functoid,
    });
    input.positions.set('src:/Root/Id', { x: 0, y: 300 });
    const result = expectCompleteLayout(input);
    for (const point of result.values()) {
      expect(point.y).toBe(300);
    }
    expect(result.get('head')!.x).toBeLessThan(result.get('middle')!.x);
    expect(result.get('middle')!.x).toBeLessThan(result.get('tail')!.x);
  });

  test('averages source and target schema anchors for the same functoid', () => {
    const input = makeInput(['middle']);
    input.links.push(
      {
        id: 'source-anchor',
        sourceId: 'source',
        sourcePath: '/Root/Id',
        sourceType: LinkEndpointType.SchemaNode,
        targetId: 'middle',
        targetType: LinkEndpointType.Functoid,
      },
      {
        id: 'target-anchor',
        sourceId: 'middle',
        sourceType: LinkEndpointType.Functoid,
        targetId: 'target',
        targetPath: '/Result/Id',
        targetType: LinkEndpointType.SchemaNode,
      }
    );
    input.positions.set('src:/Root/Id', { x: 0, y: 100 });
    input.positions.set('tgt:/Result/Id', { x: 0, y: 300 });
    expect(expectCompleteLayout(input).get('middle')!.y).toBe(200);
  });

  test.each(['source', 'target'] as const)('ignores missing %s paths and unresolved connectors without losing nodes', (side) => {
    const input = makeInput(['node']);
    const expected = layoutFunctoids(input);
    for (const path of [undefined, '/Missing/Id']) {
      input.links.push(
        side === 'source'
          ? {
              id: `source-${path}`,
              sourceId: 'source',
              sourcePath: path,
              sourceType: LinkEndpointType.SchemaNode,
              targetId: 'node',
              targetType: LinkEndpointType.Functoid,
            }
          : {
              id: `target-${path}`,
              sourceId: 'node',
              sourceType: LinkEndpointType.Functoid,
              targetId: 'target',
              targetPath: path,
              targetType: LinkEndpointType.SchemaNode,
            }
      );
    }
    input.links.push({
      id: 'direct-schema-link',
      sourceId: 'source',
      sourcePath: '/Root/Id',
      sourceType: LinkEndpointType.SchemaNode,
      targetId: 'target',
      targetPath: '/Result/Id',
      targetType: LinkEndpointType.SchemaNode,
    });
    expect(expectCompleteLayout(input)).toEqual(expected);
  });

  test('preserves original vertical ordering when clamped positions tie', () => {
    const input = makeInput(['lower', 'upper']);
    input.functoids[0].y = -100;
    input.functoids[1].y = -200;
    const result = expectCompleteLayout(input);
    expect(result.get('upper')!.y).toBeLessThan(result.get('lower')!.y);
  });

  test('compresses widely separated coordinates and spills a short viewport into columns', () => {
    const input = makeInput(Array.from({ length: 20 }, (_, index) => `node-${index}`));
    input.viewportHeight = 180;
    input.functoids.forEach((functoid, index) => {
      functoid.y = index * 1000;
    });
    const result = expectCompleteLayout(input);
    expect(new Set([...result.values()].map((point) => point.x)).size).toBeGreaterThan(1);
    for (const point of result.values()) {
      expect(point.y + input.functoidHeight / 2).toBeLessThanOrEqual(input.viewportHeight);
    }
  });
});

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
