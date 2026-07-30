// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { extendUpstreamNodeIdsForScopePaste } from '../copypaste';
import type { RootState } from '../../..';
import { createWorkflowEdge, createWorkflowNode } from '../../../utils/graph';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';

// Graph shape:
//   root
//     manual (trigger)
//     Init_Variable          (source node at root, before the parallel split)
//     Init_Parallel          (parallel branch A — NOT upstream of branches B/C)
//     Condition_outer        (parallel branch B; scope with a True subgraph — paste site)
//        └── Condition_outer-actions (subgraph paste site inside the condition)
//     For_each               (parallel branch C; loop with an empty body — paste site)
const buildState = (): RootState => {
  const rootGraph = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children: [
      createWorkflowNode('manual'),
      createWorkflowNode('Init_Variable'),
      createWorkflowNode('Init_Parallel'),
      {
        id: 'Condition_outer',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [
          createWorkflowNode('Condition_outer-#scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE),
          {
            id: 'Condition_outer-actions',
            type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
            children: [createWorkflowNode('Condition_outer-actions-#subgraph', WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE)],
            edges: [],
          },
        ],
        edges: [createWorkflowEdge('Condition_outer-#scope', 'Condition_outer-actions')],
      },
      {
        id: 'For_each',
        type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
        children: [createWorkflowNode('For_each-#scope', WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)],
        edges: [],
      },
    ],
    edges: [
      createWorkflowEdge('manual', 'Init_Variable'),
      createWorkflowEdge('Init_Variable', 'Init_Parallel'),
      createWorkflowEdge('Init_Variable', 'Condition_outer'),
      createWorkflowEdge('Init_Variable', 'For_each'),
    ],
  } as any;

  return {
    workflow: {
      graph: rootGraph,
      nodesMetadata: {
        manual: { graphId: 'root', isRoot: true, isTrigger: true },
        Init_Variable: { graphId: 'root' },
        Init_Parallel: { graphId: 'root' },
        Condition_outer: { graphId: 'root' },
        'Condition_outer-actions': { graphId: 'Condition_outer', parentNodeId: 'Condition_outer', subgraphType: 'CONDITIONAL_TRUE' },
        For_each: { graphId: 'root' },
      },
    },
    tokens: {
      outputTokens: {},
    },
  } as unknown as RootState;
};

const nodeMap: Record<string, string> = {
  manual: 'manual',
  Init_Variable: 'Init_Variable',
  Init_Parallel: 'Init_Parallel',
  Condition_outer: 'Condition_outer',
  'Condition_outer-actions': 'Condition_outer-actions',
  For_each: 'For_each',
};

describe('extendUpstreamNodeIdsForScopePaste', () => {
  it('returns only the caller ids when there is no enclosing graph or parent', () => {
    const state = buildState();
    const result = extendUpstreamNodeIdsForScopePaste(['Init_Variable'], undefined, undefined, state, nodeMap);
    expect(result).toEqual(['Init_Variable']);
  });

  it('surfaces the ancestor variable when pasting into a Condition subgraph', () => {
    // Pasting a scope into the True branch of Condition_outer. graphId is the subgraph node.
    const state = buildState();
    const result = extendUpstreamNodeIdsForScopePaste([], 'Condition_outer-actions', 'Condition_outer', state, nodeMap);
    expect(result).toContain('Init_Variable');
    expect(result).not.toContain('Init_Parallel');
  });

  it('surfaces the ancestor variable when pasting into a For each body even if parentId is undefined', () => {
    // Regression: pasting a Condition as the first/only action inside a For each. There is no
    // predecessor action, so parentId is undefined. The enclosing graphId (For_each) must still
    // surface the upstream Init_Variable while excluding the parallel-branch Init_Parallel.
    const state = buildState();
    const result = extendUpstreamNodeIdsForScopePaste([], 'For_each', undefined, state, nodeMap);
    expect(result).toContain('Init_Variable');
    expect(result).not.toContain('Init_Parallel');
  });

  it('deduplicates ids that already appear in the caller-provided upstream list', () => {
    const state = buildState();
    const result = extendUpstreamNodeIdsForScopePaste(['Init_Variable'], 'For_each', undefined, state, nodeMap);
    expect(result.filter((id) => id === 'Init_Variable')).toHaveLength(1);
  });
});
