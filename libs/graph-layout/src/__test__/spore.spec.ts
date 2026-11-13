import { describe, expect, it } from 'vitest';
import { createOverlapFixture } from '../../bench/fixtures';
import ELK, { GraphLayoutError, type ElkNode } from '../index';

const assertSpacing = (nodes: ElkNode[], spacing: number) => {
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    expect(Number.isFinite(a.x)).toBe(true);
    expect(Number.isFinite(a.y)).toBe(true);
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const horizontalGap = Math.max(b.x! - (a.x! + a.width!), a.x! - (b.x! + b.width!));
      const verticalGap = Math.max(b.y! - (a.y! + a.height!), a.y! - (b.y! + b.height!));
      expect(Math.max(horizontalGap, verticalGap)).toBeGreaterThanOrEqual(spacing - 1e-8);
    }
  }
};

describe('sporeOverlap', () => {
  const elk = new ELK();

  it.each([1, 2, 10, 50, 100])('lays out %i unpositioned data-mapper nodes deterministically with spacing', async (count) => {
    for (const seed of [1, 7, 42]) {
      const fixture = createOverlapFixture(count, seed);
      const graph = structuredClone(fixture.graph);
      const result = await elk.layout(graph);
      const second = await elk.layout(structuredClone(fixture.graph));
      expect(result).toBe(graph);
      expect(result).toEqual(second);
      expect(result.children?.map((node) => node.id)).toEqual(fixture.graph.children?.map((node) => node.id));
      assertSpacing(result.children!, 80);
      for (const child of result.children!) {
        expect(child.x!).toBeGreaterThanOrEqual(8);
        expect(child.y!).toBeGreaterThanOrEqual(8);
        expect(child.x! + child.width!).toBeLessThanOrEqual(result.width! - 8 + 1e-8);
        expect(child.y! + child.height!).toBeLessThanOrEqual(result.height! - 8 + 1e-8);
      }
    }
  });

  it('preserves positioned, already separated nodes up to translation and carries metadata through', async () => {
    const graph: ElkNode = {
      id: 'root',
      layoutOptions: { 'elk.algorithm': 'sporeOverlap', custom: 'value' },
      children: [
        { id: 'duplicate', x: -40, y: 30, width: 50, height: 20, layoutOptions: { tag: 'first' } },
        { id: 'duplicate', x: 200, y: 100, width: 30, height: 70 },
      ],
    };
    const result = await elk.layout(graph, { layoutOptions: { 'elk.spacing.nodeNode': '80' } });
    expect(result.children![1].x! - result.children![0].x!).toBe(240);
    expect(result.children![1].y! - result.children![0].y!).toBe(70);
    expect(result.layoutOptions?.custom).toBe('value');
    expect(result.children![0].layoutOptions?.tag).toBe('first');
    assertSpacing(result.children!, 80);
  });

  it('removes intersections for positioned nodes and supports zero-sized and missing dimensions', async () => {
    const graph: ElkNode = {
      id: 'root',
      children: [
        { id: 'a', x: -20, y: -20, width: 120, height: 100 },
        { id: 'b', x: 0, y: 0, width: 90, height: 30 },
        { id: 'c', x: 0, y: 0 },
      ],
    };
    const result = await elk.layout(graph, { layoutOptions: { algorithm: 'sporeOverlap', 'spacing.nodeNode': '10' } });
    assertSpacing(
      result.children!.map((node) => ({ ...node, width: node.width ?? 0, height: node.height ?? 0 })),
      10
    );
  });

  it('maintains spacing for dense fractional positioned inputs', async () => {
    let state = 145;
    const random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let run = 0; run < 20; run++) {
      const graph: ElkNode = {
        id: 'root',
        children: Array.from({ length: 30 }, (_, index) => ({
          id: String(index),
          x: random() * 50 - 25,
          y: random() * 50 - 25,
          width: random() * 100,
          height: random() * 50,
        })),
      };
      await elk.layout(graph, { layoutOptions: { algorithm: 'sporeOverlap', 'spacing.nodeNode': '15.5' } });
      assertSpacing(graph.children!, 15.5);
    }
  });

  it('honors option source precedence across aliases', async () => {
    const elkWithDefaults = new ELK({ defaultLayoutOptions: { 'elk.algorithm': 'sporeOverlap', 'elk.spacing.nodeNode': '1' } });
    const graph: ElkNode = {
      id: 'root',
      layoutOptions: { 'spacing.nodeNode': '30' },
      children: [
        { id: 'a', width: 40, height: 40 },
        { id: 'b', width: 40, height: 40 },
      ],
    };
    await elkWithDefaults.layout(graph, { layoutOptions: { 'org.eclipse.elk.spacing.nodeNode': '20', 'elk.direction': 'LEFT' } });
    assertSpacing(graph.children!, 30);
  });

  it('handles empty graphs', async () => {
    await expect(elk.layout({ id: 'root' }, { layoutOptions: { 'elk.algorithm': 'sporeOverlap' } })).resolves.toMatchObject({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  it('uses the elkjs sporeOverlap default spacing when omitted', async () => {
    const graph: ElkNode = {
      id: 'root',
      children: [
        { id: 'a', width: 100, height: 40, x: 0, y: 0 },
        { id: 'b', width: 100, height: 40, x: 0, y: 0 },
      ],
    };
    await elk.layout(graph, { layoutOptions: { algorithm: 'sporeOverlap' } });
    const [a, b] = graph.children!;
    const gap = Math.max(b.x! - (a.x! + a.width!), a.x! - (b.x! + b.width!), b.y! - (a.y! + a.height!), a.y! - (b.y! + b.height!));
    expect(gap).toBe(8);
  });

  it.each([
    [{ children: [{ id: 'a', width: -1 }] }, {}, /width/],
    [{ children: [{ id: 'a', x: Number.NaN }] }, {}, / x/],
    [
      {
        children: [
          { id: 'a', x: -Number.MAX_VALUE },
          { id: 'b', x: Number.MAX_VALUE },
        ],
      },
      {},
      /finite/,
    ],
    [{ children: [{ id: 'a', children: [{ id: 'b' }] }] }, {}, /flat/],
    [{ edges: [{ id: 'e', sources: ['a'], targets: ['b'] }] }, {}, /flat/],
    [{}, { 'elk.spacing.nodeNode': '-1' }, /spacing/],
    [{}, { 'elk.spacing.nodeNode': '' }, /spacing/],
    [{}, { 'elk.spacing.nodeNode': 'NaN' }, /spacing/],
    [{}, { 'elk.direction': 'DOWN' }, /direction/],
  ])('rejects unsupported or invalid inputs without modifying the graph', async (partial, options, message) => {
    const graph: ElkNode = { id: 'root', ...partial };
    const original = structuredClone(graph);
    const promise = elk.layout(graph, { layoutOptions: { algorithm: 'sporeOverlap', ...options } });
    await expect(promise).rejects.toThrow(GraphLayoutError);
    await expect(promise).rejects.toThrow(message);
    expect(graph).toEqual(original);
  });
});
