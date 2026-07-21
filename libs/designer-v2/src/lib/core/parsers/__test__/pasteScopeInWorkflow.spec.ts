// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { pasteScopeInWorkflow } from '../pasteScopeInWorkflow';
import { createWorkflowNode } from '../../utils/graph';
import { WORKFLOW_NODE_TYPES } from '@microsoft/logic-apps-shared';

// Reproduces the customer bug: a Condition (containing a Set Variable) is pasted into the else
// branch of an existing Condition. The pasted top node arrives with a placeholder parentNodeId
// that points at the subgraph card (`Condition-elseActions-#subgraph`) — an edge-placement node
// that is NOT a nodesMetadata key. The reducer must overwrite that with the containing graph id
// (`Condition-elseActions`) *in state* so the parent-chain walk can climb to the outer scope and
// surface ancestor-scope variables in the Set Variable dropdown.
describe('pasteScopeInWorkflow parentNodeId persistence', () => {
  const buildFixture = () => {
    const pastedNodeId = 'Condition_2';
    const graphId = 'Condition-elseActions';
    const subgraphCardId = 'Condition-elseActions-#subgraph';

    const elseSubgraph = {
      id: graphId,
      type: WORKFLOW_NODE_TYPES.SUBGRAPH_NODE,
      children: [createWorkflowNode(subgraphCardId, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE)],
      edges: [],
    } as any;

    const scopeNode = {
      id: pastedNodeId,
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode(`${pastedNodeId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)],
      edges: [],
    } as any;

    // Metadata handed to the reducer for the pasted subtree. The top node carries the broken
    // placeholder parentNodeId (the subgraph card id) that must be corrected in state.
    const pasteNodesMetadata = {
      [pastedNodeId]: { graphId, parentNodeId: subgraphCardId, isRoot: false },
    } as any;

    const state = {
      operations: {
        [pastedNodeId]: {},
      },
      nodesMetadata: {
        Initialize_variables: { graphId: 'root' },
        Condition: { graphId: 'root' },
        [graphId]: { graphId: 'Condition', parentNodeId: 'Condition', subgraphType: 'CONDITIONAL_FALSE' },
      },
      newlyAddedOperations: {},
    } as any;

    const relationshipIds = { graphId, parentId: subgraphCardId, childId: undefined } as any;

    return { pastedNodeId, graphId, elseSubgraph, scopeNode, pasteNodesMetadata, state, relationshipIds };
  };

  it('writes the corrected parentNodeId (the containing graph id) into state', () => {
    const { pastedNodeId, graphId, elseSubgraph, scopeNode, pasteNodesMetadata, state, relationshipIds } = buildFixture();

    pasteScopeInWorkflow(scopeNode, elseSubgraph, relationshipIds, {}, pasteNodesMetadata, [pastedNodeId], state, false);

    expect(state.nodesMetadata[pastedNodeId]).toBeDefined();
    expect(state.nodesMetadata[pastedNodeId].graphId).toBe(graphId);
    // The placeholder subgraph-card parentNodeId must not survive in state.
    expect(state.nodesMetadata[pastedNodeId].parentNodeId).toBe(graphId);
    expect(state.nodesMetadata[pastedNodeId].parentNodeId).not.toBe(relationshipIds.parentId);
  });

  it('leaves parentNodeId undefined when pasting at the workflow root', () => {
    const pastedNodeId = 'Condition_2';
    const rootGraph = {
      id: 'root',
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [],
      edges: [],
    } as any;
    const scopeNode = {
      id: pastedNodeId,
      type: WORKFLOW_NODE_TYPES.GRAPH_NODE,
      children: [createWorkflowNode(`${pastedNodeId}-#scope`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE)],
      edges: [],
    } as any;
    const state = {
      operations: { [pastedNodeId]: {} },
      nodesMetadata: { Initialize_variables: { graphId: 'root' } },
      newlyAddedOperations: {},
    } as any;
    const pasteNodesMetadata = { [pastedNodeId]: { graphId: 'root', parentNodeId: undefined } } as any;
    const relationshipIds = { graphId: 'root', parentId: undefined, childId: undefined } as any;

    pasteScopeInWorkflow(scopeNode, rootGraph, relationshipIds, {}, pasteNodesMetadata, [pastedNodeId], state, false);

    expect(state.nodesMetadata[pastedNodeId].graphId).toBe('root');
    expect(state.nodesMetadata[pastedNodeId].parentNodeId).toBeUndefined();
  });
});
