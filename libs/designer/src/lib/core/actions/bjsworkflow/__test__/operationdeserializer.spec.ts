import { describe, expect, it } from 'vitest';
import { initializeOutputTokensForOperations } from '../operationdeserializer';
import type { WorkflowNode } from '../../../parsers/models/workflowNode';
import type { NodesMetadata, Operations } from '../../../state/workflow/workflowInterfaces';

// Regression coverage for a scope-paste bug where a pasted node's upstreamNodeIds
// omitted every id that lived outside the pasted fragment. In particular, the
// paste-site's InitializeVariable node was dropped, which left the SetVariable
// "Name" dropdown empty because getAvailableVariables filters variables by the
// current node's upstream slice. The fix threads the paste-site upstream ids
// through initializeOperationMetadata into initializeOutputTokensForOperations
// so every pasted op picks them up.
//
// The function is verified indirectly: with empty allNodesData it silently catches
// per-op errors and still returns a NodeTokens entry for each op containing the
// passed-in existingOutputTokens appended to whatever getTokenNodeIds computed.

describe('initializeOutputTokensForOperations - existingOutputTokens plumbing', () => {
  const graph: WorkflowNode = {
    id: 'root',
    type: 'GRAPH_NODE',
    children: [],
    edges: [],
  } as unknown as WorkflowNode;

  const nodesMetadata: NodesMetadata = {
    op1: { graphId: 'root' },
    op2: { graphId: 'root' },
  } as NodesMetadata;

  const operations: Operations = {
    op1: { type: 'Http' },
    op2: { type: 'Compose' },
  } as unknown as Operations;

  it('appends every id in existingOutputTokens to each op upstreamNodeIds', () => {
    const result = initializeOutputTokensForOperations(/* allNodesData */ [], operations, graph, nodesMetadata, ['initVarId', 'triggerId']);

    expect(Object.keys(result).sort()).toEqual(['op1', 'op2']);
    for (const opId of ['op1', 'op2']) {
      expect(result[opId].upstreamNodeIds).toEqual(expect.arrayContaining(['initVarId', 'triggerId']));
    }
  });

  it('defaults existingOutputTokens to [] when not provided', () => {
    const result = initializeOutputTokensForOperations(/* allNodesData */ [], operations, graph, nodesMetadata);

    for (const opId of ['op1', 'op2']) {
      // With no fragment predecessors and no existingOutputTokens, upstream is empty.
      expect(result[opId].upstreamNodeIds).toEqual([]);
    }
  });
});
