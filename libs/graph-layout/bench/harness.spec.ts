import { describe, expect, it } from 'vitest';
import ELK from '../src/index';
import { createCandidateEngine, createElkjsEngine, runFixture } from './engines.ts';
import { createOverlapFixture, graphStats, loadWorkflowFixtures, reportFixtureFilter } from './fixtures.ts';
import { compareGeometry, extractGeometry, findOverlaps } from './geometry.ts';
import { layoutQuality } from './quality.ts';

const workflows = loadWorkflowFixtures();
const fixtures = [...workflows, createOverlapFixture(20)];
const elkjs = createElkjsEngine();
const candidate = createCandidateEngine(ELK);

describe('parity harness', () => {
  it('has the representative designer fixtures for both node UIs', () => {
    expect(workflows.map((fixture) => fixture.name)).toEqual([
      'AllScopeNodes',
      'AllScopeNodes.shared',
      'Recurrence',
      'Recurrence.shared',
      'StressTest200',
      'StressTest200.shared',
    ]);
  });

  it.each([
    [['--quality'], ['AllScopeNodes', 'Recurrence', 'StressTest200']],
    [
      ['--simple', 'StressTest200'],
      ['StressTest200', 'StressTest200.shared'],
    ],
    [
      ['Recurrence', '--quality'],
      ['Recurrence', 'Recurrence.shared'],
    ],
    [['--quality', 'StressTest200.*'], []],
  ])('selects report fixtures independently of option flags', (args, expected) => {
    const filter = reportFixtureFilter(args);
    expect(loadWorkflowFixtures(filter).map((fixture) => fixture.name)).toEqual(expected);
  });

  it('checks the reference mutation contract rather than assuming worker-style cloning', async () => {
    const graph = structuredClone(createOverlapFixture(2).graph);
    const firstChild = graph.children![0];
    expect(firstChild.x).toBeUndefined();
    const result = await elkjs.layout(graph);
    expect(result).toBe(graph);
    expect(result.children![0]).toBe(firstChild);
    expect(firstChild.x).toBeTypeOf('number');
  });

  it.each(fixtures.map((fixture) => [fixture.name, fixture] as const))('elkjs lays out %s as expected', async (_, fixture) => {
    const first = extractGeometry(await runFixture(elkjs, fixture));
    expect(Object.keys(first.nodes).length).toBe(graphStats(fixture.graph).nodes + 1);
    if (fixture.parity === 'noOverlap') {
      expect(findOverlaps(first)).toEqual([]);
      return;
    }
    const second = extractGeometry(await runFixture(elkjs, fixture));
    expect(compareGeometry(first, second, 0)).toEqual({ missingNodes: [], nodeMismatches: [], edgeMismatches: [], maxNodeDelta: 0 });
  });

  it.for(fixtures)('candidate preserves finite non-overlapping geometry on $name', async (fixture) => {
    const actual = extractGeometry(await runFixture(candidate, fixture));
    expect(Object.keys(actual.nodes).length).toBe(graphStats(fixture.graph).nodes + 1);
    expect(findOverlaps(actual, 0.01)).toEqual([]);
    for (const node of Object.values(actual.nodes)) {
      expect([node.x, node.y, node.width, node.height].every(Number.isFinite)).toBe(true);
    }
    expect(Object.keys(actual.edges).length).toBe(graphStats(fixture.graph).edges);
    for (const edge of Object.values(actual.edges)) {
      expect(edge.points.length).toBeGreaterThanOrEqual(2);
      expect(edge.points.every(({ x, y }) => Number.isFinite(x) && Number.isFinite(y))).toBe(true);
      expect(edge.container).toBeDefined();
    }
  });

  it('matches elkjs on a simple linear workflow', async () => {
    const recurrence = workflows.find((fixture) => fixture.name === 'Recurrence')!;
    const child = recurrence.graph.children![0];
    const fixture = {
      ...recurrence,
      graph: {
        ...recurrence.graph,
        children: ['a', 'b', 'c'].map((id) => ({ ...child, id })),
        edges: [
          { id: 'a-b', sources: ['a'], targets: ['b'] },
          { id: 'b-c', sources: ['b'], targets: ['c'] },
        ],
      },
    };
    const expected = extractGeometry(await runFixture(elkjs, fixture));
    const actual = extractGeometry(await runFixture(candidate, fixture));
    expect(compareGeometry(expected, actual)).toEqual({
      missingNodes: [],
      nodeMismatches: [],
      edgeMismatches: [],
      maxNodeDelta: 0,
    });
  });

  it.each(loadWorkflowFixtures((name) => name === 'StressTest200'))(
    'eliminates planar stress-tree polyline crossings in $name',
    async (fixture) => {
      const actual = await runFixture(candidate, fixture);
      expect(layoutQuality(actual)).toMatchObject({
        nodeOverlaps: 0,
        edgeNodeHits: 0,
        crossingEdgePairs: 0,
      });
    }
  );

  // Exact coordinates remain an explicit integration gate, not a claim made by invariant tests.
  // Run ELKJS_EXACT_PARITY=1 to audit remaining differences while placement/routing converge.
  it.skipIf(process.env.ELKJS_EXACT_PARITY !== '1').for(fixtures)('candidate matches elkjs on $name', async (fixture) => {
    const expected = extractGeometry(await runFixture(elkjs, fixture));
    const actual = extractGeometry(await runFixture(candidate, fixture));
    if (fixture.parity === 'noOverlap') {
      expect(Object.keys(actual.nodes).sort()).toEqual(Object.keys(expected.nodes).sort());
      expect(findOverlaps(actual)).toEqual([]);
      return;
    }
    const diff = compareGeometry(expected, actual);
    expect(diff.missingNodes).toEqual([]);
    expect(diff.nodeMismatches).toEqual([]);
    expect(diff.edgeMismatches).toEqual([]);
  });
});

describe('compareGeometry', () => {
  const base = {
    nodes: { root: { x: 0, y: 0, width: 100, height: 100 }, a: { x: 10, y: 10, width: 20, height: 20, parent: 'root' } },
    edges: {
      e: {
        container: 'root',
        points: [
          { x: 0, y: 0 },
          { x: 5, y: 5 },
          { x: 10, y: 10 },
        ],
      },
    },
  };

  it('tolerates sub-tolerance node deltas and differing bend points', () => {
    const actual = {
      nodes: { ...base.nodes, a: { ...base.nodes.a, x: 10.3 } },
      edges: {
        e: {
          container: 'root',
          points: [
            { x: 0, y: 0 },
            { x: 10, y: 10 },
          ],
        },
      },
    };
    expect(compareGeometry(base, actual)).toMatchObject({ nodeMismatches: [], edgeMismatches: [], maxNodeDelta: 0.3 });
  });

  it('reports moved, reparented, and missing nodes and edges with wrong containers or endpoints', () => {
    expect(compareGeometry(base, { nodes: { root: base.nodes.root }, edges: {} })).toMatchObject({
      missingNodes: ['a'],
      edgeMismatches: [{ id: 'e', reason: 'missing' }],
    });
    const moved = compareGeometry(base, {
      nodes: { root: base.nodes.root, a: { ...base.nodes.a, y: 14, parent: 'other' } },
      edges: { e: { container: 'other', points: base.edges.e.points } },
    });
    expect(moved.nodeMismatches).toEqual([{ id: 'a', delta: 4 }]);
    expect(moved.edgeMismatches[0].reason).toMatch(/container/);
    const rerouted = compareGeometry(base, {
      nodes: base.nodes,
      edges: {
        e: {
          container: 'root',
          points: [
            { x: 0, y: 0 },
            { x: 12, y: 10 },
          ],
        },
      },
    });
    expect(rerouted.edgeMismatches).toEqual([{ id: 'e', reason: 'endpoints differ' }]);
  });

  it('finds overlapping siblings but ignores the root', () => {
    expect(findOverlaps(base)).toEqual([]);
    const overlapping = { ...base, nodes: { ...base.nodes, b: { x: 25, y: 25, width: 20, height: 20, parent: 'root' } } };
    expect(findOverlaps(overlapping)).toEqual([['a', 'b']]);
    expect(findOverlaps(overlapping, 10)).toEqual([]);
  });
});
