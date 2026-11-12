import { describe, expect, it } from 'vitest';
import ELK from '../src/index';
import { createCandidateEngine, createElkjsEngine, isImplemented, runFixture } from './engines.ts';
import { createOverlapFixture, graphStats, loadWorkflowFixtures } from './fixtures.ts';
import { compareGeometry, extractGeometry, findOverlaps } from './geometry.ts';

// Large stress fixtures are covered by `pnpm bench` / `pnpm bench:report` instead of unit tests.
const fixtures = [...loadWorkflowFixtures().filter((fixture) => graphStats(fixture.graph).nodes <= 250), createOverlapFixture(20)];
const elkjs = createElkjsEngine();
const candidate = createCandidateEngine(ELK);

describe('parity harness', () => {
  it('has captured designer fixtures', () => {
    expect(fixtures.length).toBeGreaterThan(10);
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

  it.for(fixtures)('candidate matches elkjs on $name', async (fixture, { skip }) => {
    if (!(await isImplemented(candidate, fixture))) {
      skip();
    }
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
