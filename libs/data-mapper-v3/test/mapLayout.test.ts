import { applyMapPatches, createMapLayoutPrompt, createMapPrompt, parseMapPromptResponse } from '../src/copilot/mapPrompt';
import { DEFAULT_MAP_OPTIONS, FunctoidCategory, LinkEndpointType, ParameterType, ScriptType } from '../src/model/mapModel';
import type { MapDocument, MapFunctoid, MapPage } from '../src/model/mapModel';
import { BtmSerializer } from '../src/schema/btmSerializer';

function makePage(id: string, count: number, edges: [number, number][] = []): MapPage {
  const functoids: MapFunctoid[] = Array.from({ length: count }, (_, index) => ({
    id: String(index),
    functoidId: 107,
    category: FunctoidCategory.String,
    name: 'String Concatenate',
    x: 1,
    y: 1,
    inputLinks: [],
    outputLinks: [],
    parameters: [{ index: 0, type: ParameterType.Constant, value: 'unchanged' }],
  }));
  const links = edges.map(([from, to], index) => {
    const id = String(index);
    functoids[from].outputLinks.push(id);
    functoids[to].inputLinks.push(id);
    functoids[to].parameters.push({
      index: functoids[to].parameters.length,
      type: ParameterType.Link,
      value: id,
    });
    return {
      id,
      sourceId: String(from),
      targetId: String(to),
      sourceType: LinkEndpointType.Functoid,
      targetType: LinkEndpointType.Functoid,
    };
  });
  return { id, name: id, functoids, links };
}

function makeMap(pages: MapPage[]): MapDocument {
  return {
    name: 'Layout regression',
    version: '1',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS },
    targetValues: { '/Root/Constant': 'preserve' },
    pages,
  };
}

function withoutCoordinates(map: MapDocument): unknown {
  return {
    ...map,
    pages: map.pages.map((page) => ({
      ...page,
      functoids: page.functoids.map(({ x: _x, y: _y, ...rest }) => rest),
    })),
  };
}

function expectSpaced(page: MapPage): void {
  for (const [index, a] of page.functoids.entries()) {
    expect(Number.isFinite(a.x) && Number.isFinite(a.y)).toBe(true);
    expect(a.x).toBeGreaterThanOrEqual(80);
    expect(a.y).toBeGreaterThanOrEqual(80);
    for (const b of page.functoids.slice(index + 1)) {
      // Canvas nodes have radius 32 plus 8px input/output connectors.
      expect(Math.abs(a.x - b.x) >= 100 || Math.abs(a.y - b.y) >= 100).toBe(true);
    }
  }
}

describe('Assistant multi-page layout', () => {
  test('arranges all 410 functoids across 15 pages with a single parsed operation', () => {
    const counts = [13, 37, 4, 2, 41, 0, 88, 78, 38, 38, 12, 25, 33, 0, 1];
    const map = makeMap(
      counts.map((count, index) =>
        makePage(
          `page${index}`,
          count,
          Array.from({ length: count - 1 }, (_, n): [number, number] => [n, n + 1])
        )
      )
    );
    const snapshot = JSON.stringify(map);
    const plan = parseMapPromptResponse('{"summary":"Arrange all pages","patches":[{"op":"layout","path":"/pages"}]}');
    const updated = applyMapPatches(map, plan.patches);
    expect(plan.patches).toHaveLength(1);
    expect(updated.pages).toHaveLength(15);
    expect(updated.pages.flatMap((page) => page.functoids)).toHaveLength(410);
    for (const page of updated.pages) {
      expectSpaced(page);
      expect(page.functoids.every((node) => node.x !== 1 && node.y !== 1)).toBe(true);
    }
    expect(withoutCoordinates(updated)).toEqual(withoutCoordinates(map));
    expect(JSON.stringify(map)).toBe(snapshot);
    expect(applyMapPatches(updated, plan.patches)).toEqual(updated);
  });

  test.each([
    {
      name: 'reverse-ordered chain',
      count: 3,
      edges: [
        [2, 1],
        [1, 0],
      ],
    },
    {
      name: 'diamond and disconnected nodes',
      count: 7,
      edges: [
        [0, 1],
        [0, 2],
        [1, 3],
        [2, 3],
        [4, 5],
      ],
    },
    { name: 'empty page', count: 0, edges: [] },
    { name: 'singleton', count: 1, edges: [] },
  ])('lays out $name without overlaps or backwards dependencies', ({ count, edges }) => {
    const map = makeMap([
      makePage(
        'page',
        count,
        edges.map(([from, to]) => [from, to])
      ),
    ]);
    const updated = applyMapPatches(map, [{ op: 'layout', path: '/pages' }]);
    const page = updated.pages[0];
    expectSpaced(page);
    for (const [from, to] of edges) {
      expect(page.functoids[from].x).toBeLessThan(page.functoids[to].x);
    }
    expect(withoutCoordinates(updated)).toEqual(withoutCoordinates(map));
  });

  test('handles cycles, self-links and pre-existing dangling links without changing them', () => {
    const page = makePage('page', 5, [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [4, 4],
    ]);
    page.links.push({
      id: 'dangling',
      sourceId: 'missing',
      targetId: '0',
      sourceType: LinkEndpointType.Functoid,
      targetType: LinkEndpointType.Functoid,
    });
    const map = makeMap([page]);
    const updated = applyMapPatches(map, [{ op: 'layout', path: '/pages' }]);
    expectSpaced(updated.pages[0]);
    expect(withoutCoordinates(updated)).toEqual(withoutCoordinates(map));
    expect(applyMapPatches(updated, [{ op: 'layout', path: '/pages' }])).toEqual(updated);
  });

  test('targets an inactive page and preserves scripts and all other pages', () => {
    const map = makeMap([makePage('first', 3), makePage('second', 2, [[0, 1]])]);
    Object.assign(map.pages[1].functoids[0], {
      functoidId: 260,
      category: FunctoidCategory.Advanced,
      name: 'Scripting',
      scriptType: ScriptType.InlineCSharp,
      scriptContent: 'public string Transform() { return "keep"; }',
      scriptImplementations: [
        {
          type: ScriptType.InlineCSharp,
          content: 'public string Transform() { return "keep"; }',
          assemblyReferences: ['Helpers.dll'],
        },
      ],
    });
    const plan = parseMapPromptResponse('{"summary":"Arrange second","patches":[{"op":"layout","path":"/pages/1"}]}');
    const updated = applyMapPatches(map, plan.patches);
    expect(updated.pages[0]).toEqual(map.pages[0]);
    expectSpaced(updated.pages[1]);
    expect(withoutCoordinates(updated)).toEqual(withoutCoordinates(map));

    const serializer = new BtmSerializer();
    const baseline = serializer.deserialize(serializer.serialize(map));
    const roundTrip = serializer.deserialize(serializer.serialize(updated));
    expect(withoutCoordinates(roundTrip)).toEqual(withoutCoordinates(baseline));
    expect(roundTrip.pages[1].functoids.map(({ x, y }) => ({ x, y }))).toEqual(updated.pages[1].functoids.map(({ x, y }) => ({ x, y })));
  });

  test('page layout is independent of other pages and standard patches keep their ordering', () => {
    const first = makePage('first', 3, [
      [2, 0],
      [2, 1],
    ]);
    const map = makeMap([first, makePage('second', 1)]);
    const updated = applyMapPatches(map, [
      { op: 'move', from: '/pages/1', path: '/pages/0' },
      { op: 'layout', path: '/pages/1' },
      { op: 'replace', path: '/pages/1/functoids/0/x', value: 999 },
    ]);
    const alone = applyMapPatches(makeMap([first]), [
      { op: 'layout', path: '/pages' },
      { op: 'replace', path: '/pages/0/functoids/0/x', value: 999 },
    ]);
    expect(updated.pages[1]).toEqual(alone.pages[0]);
    expect(updated.pages[0]).toEqual(map.pages[1]);
  });

  test.each(['/name', '/pages/-', '/pages/01', '/pages/-1', '/pages/0/functoids', '/pages/__proto__'])(
    'rejects invalid layout scope %s',
    (path) => {
      expect(() =>
        parseMapPromptResponse(
          JSON.stringify({
            summary: 'invalid',
            patches: [{ op: 'layout', path }],
          })
        )
      ).toThrow('Layout requires');
    }
  );

  test('rejects missing pages atomically and retains the ordinary patch limit', () => {
    const map = makeMap([makePage('page', 2)]);
    const snapshot = JSON.stringify(map);
    expect(() =>
      applyMapPatches(map, [
        { op: 'layout', path: '/pages/0' },
        { op: 'layout', path: '/pages/1' },
      ])
    ).toThrow('out of range');
    expect(JSON.stringify(map)).toBe(snapshot);
    const patch = { op: 'replace', path: '/name', value: 'same' };
    expect(
      parseMapPromptResponse(
        JSON.stringify({
          summary: 'rename',
          patches: Array(200).fill(patch),
        })
      ).patches
    ).toHaveLength(200);
    expect(() =>
      parseMapPromptResponse(
        JSON.stringify({
          summary: 'rename',
          patches: Array(201).fill(patch),
        })
      )
    ).toThrow('too many changes');
  });

  test('documents all-page scope and offers a compact prompt without full graph or scripts', () => {
    const map = makeMap([makePage('first', 2), makePage('second', 2)]);
    map.pages[0].functoids[0].scriptContent = 'DO_NOT_INCLUDE_SCRIPT';
    const full = createMapPrompt('Arrange each page', map, 1, undefined, undefined, []);
    const compact = createMapLayoutPrompt('Arrange each page', map, 1);
    for (const prompt of [full, compact]) {
      expect(prompt).toContain('{"op":"layout","path":"/pages"}');
      expect(prompt).toContain('including inactive pages');
      expect(prompt).toContain('Active page index: 1');
    }
    expect(compact).toContain('"index":0,"name":"first","functoidCount":2');
    expect(compact).toContain('"index":1,"name":"second","functoidCount":2');
    expect(compact).not.toContain('DO_NOT_INCLUDE_SCRIPT');
    expect(compact).not.toContain('inputLinks');
    expect(compact).toContain('larger context window');
  });
});
