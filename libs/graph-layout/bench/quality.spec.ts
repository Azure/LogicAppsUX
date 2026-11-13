import { describe, expect, it } from 'vitest';
import type { ElkNode } from '../src/types';
import { layoutQuality } from './quality';

describe('polyline quality diagnostics', () => {
  it('counts node-interior hits but ignores endpoint boxes and border touches', () => {
    const graph: ElkNode = {
      id: 'root',
      children: [
        { id: 'a', x: 0, y: 0, width: 20, height: 20 },
        { id: 'b', x: 0, y: 100, width: 20, height: 20 },
        { id: 'obstacle', x: 5, y: 40, width: 20, height: 20 },
        { id: 'border', x: 10, y: 70, width: 20, height: 20 },
      ],
      edges: [
        {
          id: 'ab',
          sources: ['a'],
          targets: ['b'],
          sections: [{ id: 'ab_s0', startPoint: { x: 10, y: 20 }, endPoint: { x: 10, y: 100 } }],
        },
      ],
    };
    expect(layoutQuality(graph)).toEqual({
      nodeOverlaps: 0,
      edgeNodeHits: 1,
      collinearEdgePairs: 0,
      crossingEdgePairs: 0,
      meanCenterSkew: 0,
    });
  });

  it('counts positive-length shared segments once per edge pair, not crossings', () => {
    const graph: ElkNode = {
      id: 'root',
      edges: [
        { id: 'a', sources: ['x'], targets: ['y'], sections: [{ id: 'a0', startPoint: { x: 0, y: 0 }, endPoint: { x: 0, y: 20 } }] },
        { id: 'b', sources: ['x'], targets: ['y'], sections: [{ id: 'b0', startPoint: { x: 0, y: 10 }, endPoint: { x: 0, y: 30 } }] },
        { id: 'c', sources: ['x'], targets: ['y'], sections: [{ id: 'c0', startPoint: { x: -10, y: 15 }, endPoint: { x: 10, y: 15 } }] },
      ],
    };
    expect(layoutQuality(graph).collinearEdgePairs).toBe(1);
    expect(layoutQuality(graph).crossingEdgePairs).toBe(2);
  });
});
