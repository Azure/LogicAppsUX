/* eslint-disable no-param-reassign */
import type { IdsForDiscovery } from '../state/panel/panelInterfaces';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { reassignEdgeSources, reassignEdgeTargets, addNewEdge, applyIsRootNode } from './restructuringHelpers';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';

export interface AddNodePayload {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
  nodeId: string;
  discoveryIds: IdsForDiscovery;
  isParallelBranch?: boolean;
}

export const createNodeWithDefaultSize = (id: string): WorkflowNode => {
  return { id, height: 67, width: 200, type: WORKFLOW_NODE_TYPES.OPERATION_NODE };
};

export const addNodeToWorkflow = (
  payload: AddNodePayload,
  workflowGraph: WorkflowNode,
  nodesMetadata: NodesMetadata,
  state: WorkflowState
) => {
  const { nodeId: newNodeId } = payload;
  const { graphId, parentId, childId } = payload.discoveryIds;

  // Add Node Data
  const workflowNode: WorkflowNode = createNodeWithDefaultSize(newNodeId);
  workflowGraph.children = [...(workflowGraph?.children ?? []), workflowNode];

  // Update metadata
  const isRoot = parentId?.split('-#')[0] === graphId;
  const parentNodeId = graphId !== 'root' ? graphId : undefined;
  nodesMetadata[newNodeId] = { graphId, parentNodeId, ...(isRoot && { isRoot }) };

  state.operations[newNodeId] = { type: payload.operation.type };

  // Parallel Branch creation, just add the singular node
  if (payload.isParallelBranch && parentId) {
    addNewEdge(state, parentId, newNodeId, workflowGraph);
  }
  // X parents, 1 child
  else if (childId) {
    reassignEdgeTargets(state, childId, newNodeId, workflowGraph);
    addNewEdge(state, newNodeId, childId, workflowGraph);
  }
  // 1 parent, X children
  else if (parentId) {
    reassignEdgeSources(state, parentId, newNodeId, workflowGraph);
    addNewEdge(state, parentId, newNodeId, workflowGraph);
  }

  if (isRoot) applyIsRootNode(state, newNodeId, workflowGraph, nodesMetadata);

  // Increase action count of graph
  if (nodesMetadata[workflowGraph.id]) {
    nodesMetadata[workflowGraph.id].actionCount = nodesMetadata[graphId].actionCount ?? 0 + 1;
  }
};

export const addWorkflowNode = (node: WorkflowNode, graph: WorkflowNode): void => {
  graph.children = [...(graph?.children ?? []), node];
};
