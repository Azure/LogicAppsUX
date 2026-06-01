import { describe, test, expect } from 'vitest';
import type { WorkflowState } from '../../state/workflow/workflowInterfaces';
import type { WorkflowNode, WorkflowEdge } from '../../parsers/models/workflowNode';
import { WORKFLOW_NODE_TYPES, WORKFLOW_EDGE_TYPES } from '@microsoft/logic-apps-shared';
import { canWrapSelectedNodes, getCommonGraphId, getOrderedSelectedChain } from '../multiselect';

const makeEdge = (source: string, target: string): WorkflowEdge => ({
  id: `${source}-${target}`,
  source,
  target,
  type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
});

const makeOperationNode = (id: string): WorkflowNode => ({
  id,
  type: WORKFLOW_NODE_TYPES.OPERATION_NODE,
});

/**
 * Builds a single-level (root) graph:
 *   Trigger -> A -> B -> C -> D
 * with the given extra edges/children appended.
 */
const buildLinearState = (): WorkflowState => {
  const children = ['Trigger', 'A', 'B', 'C', 'D'].map(makeOperationNode);
  const edges = [makeEdge('Trigger', 'A'), makeEdge('A', 'B'), makeEdge('B', 'C'), makeEdge('C', 'D')];

  const graph: WorkflowNode = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children,
    edges,
  };

  return {
    graph,
    nodesMetadata: {
      Trigger: { graphId: 'root', isRoot: true, isTrigger: true },
      A: { graphId: 'root' },
      B: { graphId: 'root' },
      C: { graphId: 'root' },
      D: { graphId: 'root' },
    },
  } as unknown as WorkflowState;
};

/**
 * Builds a graph with a parallel fan-out:
 *   Trigger -> A ; A -> B ; A -> C  (B and C are parallel siblings)
 */
const buildParallelState = (): WorkflowState => {
  const children = ['Trigger', 'A', 'B', 'C'].map(makeOperationNode);
  const edges = [makeEdge('Trigger', 'A'), makeEdge('A', 'B'), makeEdge('A', 'C')];
  const graph: WorkflowNode = {
    id: 'root',
    type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
    children,
    edges,
  };
  return {
    graph,
    nodesMetadata: {
      Trigger: { graphId: 'root', isRoot: true, isTrigger: true },
      A: { graphId: 'root' },
      B: { graphId: 'root' },
      C: { graphId: 'root' },
    },
  } as unknown as WorkflowState;
};

describe('multiselect utils', () => {
  describe('getCommonGraphId', () => {
    test('returns the shared graphId when all nodes are on the same level', () => {
      const state = buildLinearState();
      expect(getCommonGraphId(state, ['A', 'B', 'C'])).toBe('root');
    });

    test('returns undefined when nodes span different graph levels', () => {
      const state = buildLinearState();
      state.nodesMetadata.C.graphId = 'Scope-actions';
      expect(getCommonGraphId(state, ['A', 'C'])).toBeUndefined();
    });

    test('returns undefined for empty input', () => {
      const state = buildLinearState();
      expect(getCommonGraphId(state, [])).toBeUndefined();
    });
  });

  describe('getOrderedSelectedChain', () => {
    test('returns the ordered chain for a contiguous selection', () => {
      const state = buildLinearState();
      expect(getOrderedSelectedChain(state, ['B', 'C', 'D'])).toEqual(['B', 'C', 'D']);
    });

    test('orders the chain regardless of input ordering', () => {
      const state = buildLinearState();
      expect(getOrderedSelectedChain(state, ['D', 'B', 'C'])).toEqual(['B', 'C', 'D']);
    });

    test('returns undefined when an unselected node sits between two selected nodes', () => {
      const state = buildLinearState();
      // A and C selected, B (between them) not selected -> not contiguous.
      expect(getOrderedSelectedChain(state, ['A', 'C'])).toBeUndefined();
    });

    test('returns undefined when a trigger is part of the selection', () => {
      const state = buildLinearState();
      expect(getOrderedSelectedChain(state, ['Trigger', 'A'])).toBeUndefined();
    });

    test('returns undefined for a single node', () => {
      const state = buildLinearState();
      expect(getOrderedSelectedChain(state, ['A'])).toBeUndefined();
    });

    test('returns undefined for parallel (non-chained) siblings', () => {
      const state = buildParallelState();
      expect(getOrderedSelectedChain(state, ['B', 'C'])).toBeUndefined();
    });

    test('returns undefined when nodes are on different graph levels', () => {
      const state = buildLinearState();
      state.nodesMetadata.D.graphId = 'Scope-actions';
      expect(getOrderedSelectedChain(state, ['C', 'D'])).toBeUndefined();
    });
  });

  describe('canWrapSelectedNodes', () => {
    test('is true for a contiguous same-level selection', () => {
      const state = buildLinearState();
      expect(canWrapSelectedNodes(state, ['B', 'C', 'D'])).toBe(true);
    });

    test('is false for a non-contiguous selection', () => {
      const state = buildLinearState();
      expect(canWrapSelectedNodes(state, ['A', 'C'])).toBe(false);
    });
  });
});
