/* eslint-disable no-param-reassign */
import type { IdsForDiscovery } from '../state/panel/panelInterfaces';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import {
  reassignNodeRunAfter,
  reassignEdgeSources,
  reassignNodeRunAfterLeafNode,
  reassignEdgeTargets,
  addNewEdge,
  removeEdge,
} from './restructuringHelpers';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';
import { WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';

export interface AddNodePayload {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
  id: string;
  discoveryIds: IdsForDiscovery;
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
  const { id: newNodeId } = payload;
  const { parentId, childId } = payload.discoveryIds;

  // Add Node Data
  const workflowNode: WorkflowNode = createNodeWithDefaultSize(newNodeId);
  addWorkflowNode(workflowNode, workflowGraph);
  nodesMetadata[newNodeId] = { graphId: payload.discoveryIds.graphId };
  state.operations[newNodeId] = { type: payload.operation.type };

  // Adjust edges
  if (parentId && childId) {
    // 1 parent and 1 child
    removeEdge(parentId, childId, workflowGraph);
    addNewEdge(parentId, newNodeId, workflowGraph);
    addNewEdge(newNodeId, childId, workflowGraph);
    reassignNodeRunAfter(state, childId, parentId, newNodeId);
  } else {
    if (parentId) {
      // 1 parent, X children
      reassignEdgeSources(state, parentId, newNodeId, workflowGraph);
      addNewEdge(parentId, newNodeId, workflowGraph);
      reassignNodeRunAfterLeafNode(state, parentId, newNodeId);
    }
    if (childId) {
      // X parents, 1 child
      reassignEdgeTargets(state, childId, newNodeId, workflowGraph);
      addNewEdge(newNodeId, childId, workflowGraph);
    }
  }
};

export const addWorkflowNode = (node: WorkflowNode, graph: WorkflowNode): void => {
  graph.children = [...(graph?.children ?? []), node];
};
