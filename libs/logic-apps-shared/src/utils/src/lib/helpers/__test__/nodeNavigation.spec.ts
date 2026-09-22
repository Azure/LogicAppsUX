import type { Node } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { WORKFLOW_NODE_TYPES } from '../../models/workflowNode';
import { getAdjacentNode } from '../nodeNavigation';

const node = (id: string, nodeIndex: unknown, overrides: Partial<Node> = {}): Node => ({
  id,
  type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
  position: { x: 0, y: 0 },
  data: { nodeIndex },
  ...overrides,
});

describe('getAdjacentNode', () => {
  const first = node('Trigger', 1, { position: { x: 1000, y: 1000 } });
  const scope = node('Scope-#scope', 10, { type: WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE });
  const nested = node('Nested', 30, { parentId: 'Scope', position: { x: -1000, y: -1000 } });
  const last = node('Last', 100, { position: { x: 0, y: -2000 } });
  const nodes = [last, nested, first, scope];

  it.each([
    ['Trigger', 'next', scope],
    ['Scope', 'next', nested],
    ['Nested', 'next', last],
    ['Last', 'previous', nested],
    ['Nested', 'previous', scope],
    ['Scope', 'previous', first],
  ] as const)('finds the nearest index from %s going %s, regardless of array/geometry order', (selectedId, direction, expected) => {
    expect(getAdjacentNode(nodes, selectedId, direction)).toBe(expected);
  });

  it.each([undefined, '', 'Deleted'])('starts at the first/last index when selection is %s', (selectedId) => {
    expect(getAdjacentNode(nodes, selectedId, 'next')).toBe(first);
    expect(getAdjacentNode(nodes, selectedId, 'previous')).toBe(last);
  });

  it('stops at both ends instead of wrapping', () => {
    expect(getAdjacentNode(nodes, 'Trigger', 'previous')).toBeUndefined();
    expect(getAdjacentNode(nodes, 'Last', 'next')).toBeUndefined();
  });

  it('handles empty and single-node graphs', () => {
    for (const direction of ['next', 'previous'] as const) {
      expect(getAdjacentNode([], undefined, direction)).toBeUndefined();
      expect(getAdjacentNode([first], undefined, direction)).toBe(first);
      expect(getAdjacentNode([first], 'Trigger', direction)).toBeUndefined();
    }
  });

  it.each([
    WORKFLOW_NODE_TYPES.GRAPH_NODE,
    WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
    WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE,
    WORKFLOW_NODE_TYPES.HIDDEN_NODE,
    WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE,
    WORKFLOW_NODE_TYPES.COLLAPSED_NODE,
    WORKFLOW_NODE_TYPES.NOTE_NODE,
    undefined,
    'unknown',
  ])('excludes %s even with a valid index', (type) => {
    const excluded = node('Excluded', 5, { type });
    expect(getAdjacentNode([first, excluded, scope], 'Trigger', 'next')).toBe(scope);
    expect(getAdjacentNode([first, excluded, scope], 'Scope', 'previous')).toBe(first);
  });

  it.each([undefined, null, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, '5', true])(
    'excludes invalid index %s rather than coercing it',
    (index) => {
      const excluded = node('Excluded', index);
      expect(getAdjacentNode([first, excluded, scope], 'Trigger', 'next')).toBe(scope);
      expect(getAdjacentNode([excluded], undefined, 'previous')).toBeUndefined();
    }
  );

  it('excludes hidden operations and scope cards and treats their selection as unavailable', () => {
    const hidden = [
      node('HiddenOperation', 2, { hidden: true }),
      node('HiddenScope-#scope', 3, { hidden: true, type: WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE }),
    ];
    expect(getAdjacentNode([first, ...hidden, scope], 'Trigger', 'next')).toBe(scope);
    expect(getAdjacentNode([first, ...hidden, scope], 'HiddenScope', 'previous')).toBe(scope);
  });

  it('accepts positive finite fractional indices and gaps', () => {
    const fractional = node('Fractional', 1.5);
    expect(getAdjacentNode([scope, fractional, first], 'Trigger', 'next')).toBe(fractional);
  });

  it('uses changed layout indices on subsequent calls', () => {
    const moved = { ...last, data: { nodeIndex: 2 } };
    expect(getAdjacentNode(nodes, 'Trigger', 'next')).toBe(scope);
    expect(getAdjacentNode([scope, first, nested, moved], 'Trigger', 'next')).toBe(moved);
  });

  it('does not mutate the array, node data, or positions', () => {
    const frozenNodes = Object.freeze(
      nodes.map((entry) =>
        Object.freeze({ ...entry, data: Object.freeze({ ...entry.data }), position: Object.freeze({ ...entry.position }) })
      )
    );
    const originalIds = frozenNodes.map(({ id }) => id);
    expect(getAdjacentNode(frozenNodes, 'Scope', 'next')).toBe(frozenNodes[1]);
    expect(getAdjacentNode(frozenNodes, 'Scope', 'previous')).toBe(frozenNodes[2]);
    expect(frozenNodes.map(({ id }) => id)).toEqual(originalIds);
  });
});
