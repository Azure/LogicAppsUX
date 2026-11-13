import { describe, expect, it } from 'vitest';
import { Position, type Node } from '@xyflow/react';
import { SUBGRAPH_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';
import { getPrecomputedHandles } from '../precomputedHandles';
import { exportForTesting } from '../elklayout';

const operation: Node = {
  id: 'action',
  type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
  position: { x: 0, y: 0 },
  data: { presentation: { shared: false } },
};

describe('provisional public XYFlow handles', () => {
  it('uses the full target hit surface and the legacy draw handle offset, including read-only mode', () => {
    expect(getPrecomputedHandles(operation, 200, 44)).toEqual([
      { type: 'target', position: Position.Top, x: 0, y: 0, width: 200, height: 44 },
      { type: 'source', position: Position.Bottom, x: 95, y: 39, width: 10, height: 10 },
    ]);
    expect(getPrecomputedHandles(operation, 200, 44, true)?.[1]).toMatchObject({ y: 34 });
  });

  it('distinguishes scope headers from footer draw handles', () => {
    const header = { ...operation, type: WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE, id: 'scope-#scope' };
    expect(getPrecomputedHandles(header, 200, 44)?.[1]).toMatchObject({ x: 97, y: 38, width: 6, height: 6 });
    expect(getPrecomputedHandles({ ...header, id: 'scope-#footer' }, 200, 44)?.[1]).toMatchObject({ y: 39, width: 10 });
  });

  it('positions subgraph card handles at the header edge, not the full node including its DropZone', () => {
    const branch = { ...operation, type: WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE, id: 'case-#subgraph' };
    expect(getPrecomputedHandles(branch, 200, 68, false, SUBGRAPH_TYPES.SWITCH_CASE)?.[1]).toMatchObject({ y: 38 });
    expect(getPrecomputedHandles(branch, 120, 56, false, SUBGRAPH_TYPES.CONDITIONAL_TRUE)?.[1]).toMatchObject({ y: 26 });
    expect(getPrecomputedHandles(branch, 20, 44, false, SUBGRAPH_TYPES.SWITCH_ADD_CASE)?.[1]).toMatchObject({ y: 38 });
    expect(getPrecomputedHandles(branch, 20, 44, true, SUBGRAPH_TYPES.SWITCH_ADD_CASE)).toBeUndefined();
    expect(getPrecomputedHandles(branch, 200, 68)).toBeUndefined();
  });

  it('uses canonical shared action handle metrics without guessing embedded family ports', () => {
    const shared = { ...operation, data: { presentation: { shared: true } } };
    expect(getPrecomputedHandles(shared, 232, 74)?.[1]).toMatchObject({ x: 110, y: 69, width: 12, height: 12 });
    for (const family of ['if', 'switch', 'loop', 'agent', 'tool', 'branch', 'add']) {
      expect(getPrecomputedHandles({ ...shared, data: { presentation: { shared: true, family } } }, 232, 74)).toBeUndefined();
    }
    expect(getPrecomputedHandles(operation, 200, 44, false, SUBGRAPH_TYPES.MCP_CLIENT)).toBeUndefined();
    expect(getPrecomputedHandles({ ...shared, data: { branchPorts: [{ id: 'case' }] } }, 232, 74)).toBeUndefined();
  });

  it('leaves unknown, structural and unsized nodes on the normal DOM measurement path', () => {
    for (const type of [WORKFLOW_NODE_TYPES.NOTE_NODE, WORKFLOW_NODE_TYPES.GRAPH_NODE, WORKFLOW_NODE_TYPES.HIDDEN_NODE, 'unknown']) {
      expect(getPrecomputedHandles({ ...operation, type }, 200, 44)).toBeUndefined();
    }
    for (const width of [undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(getPrecomputedHandles(operation, width, 44)).toBeUndefined();
    }
  });

  it('supplies public bounds and initial dimensions without freezing native card growth', () => {
    const [nodes] = exportForTesting.convertElkGraphToReactFlow({
      id: 'root',
      children: [{ id: 'action', x: 0, y: 0, width: 200, height: 60 }],
    });
    expect(nodes[0]).toMatchObject({ initialWidth: 200, initialHeight: 60, handles: getPrecomputedHandles(operation, 200, 60) });
    expect(nodes[0]).not.toHaveProperty('height');
    expect(nodes[0]).not.toHaveProperty('width');
    expect(nodes[0]).not.toHaveProperty('measured');
    expect(nodes[0]).not.toHaveProperty('internals');
  });
});
