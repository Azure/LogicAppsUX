/* eslint-disable no-param-reassign */
import type { IdsForDiscovery } from '../state/panel/panelInterfaces';
import type { NodesMetadata } from '../state/workflow/workflowInterfaces';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import { WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from './models/workflowNode';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft-logic-apps/utils';

export interface AddNodePayload {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
  id: string;
  discoveryIds: IdsForDiscovery;
}

export const createNodeWithDefaultSize = (id: string): WorkflowNode => {
  return { id, height: 67, width: 200, type: WORKFLOW_NODE_TYPES.OPERATION_NODE };
};

export const addNodeToWorkflow = (payload: AddNodePayload, workflowGraph: WorkflowNode, nodesMetadata: NodesMetadata) => {
  // Add Node Data
  nodesMetadata[payload.id] = { graphId: payload.discoveryIds.graphId };
  const workflowNode: WorkflowNode = createNodeWithDefaultSize(payload.id);
  addWorkflowNode(workflowNode, workflowGraph);

  // Adjust edges
  const { id: newNodeId } = payload;
  const { parentId, childId } = payload.discoveryIds;

  if (parentId && childId) {
    // 1 parent and 1 child
    removeEdge(parentId, childId, workflowGraph);
    addNewEdge(parentId, newNodeId, workflowGraph);
    addNewEdge(newNodeId, childId, workflowGraph);
  } else {
    if (parentId) {
      // 1 parent, X children
      reassignEdgeSources(parentId, newNodeId, workflowGraph);
      addNewEdge(parentId, newNodeId, workflowGraph);
    }
    if (childId) {
      // 1 child, X parents
      reassignEdgeTargets(childId, newNodeId, workflowGraph);
      addNewEdge(newNodeId, childId, workflowGraph);
    }
  }

  // Need to update runAfter settings
};

export const addWorkflowNode = (node: WorkflowNode, graph: WorkflowNode): void => {
  graph.children = [...(graph?.children ?? []), node];
};

export const addNewEdge = (parent: string, child: string, graph: WorkflowNode) => {
  const workflowEdge: WorkflowEdge = {
    id: `${parent}-${child}`,
    source: parent,
    target: child,
    type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
  };
  if (!graph?.edges) graph.edges = [];
  graph?.edges.push(workflowEdge);
};

const removeEdge = (sourceId: string, targetId: string, graph: WorkflowNode) => {
  graph.edges = graph.edges?.filter((edge) => !(edge.source === sourceId && edge.target === targetId));
};

// Reassign edge source ids to new node id
const reassignEdgeSources = (oldSourceId: string, newSourceId: string, graph: WorkflowNode) => {
  graph.edges = graph.edges?.map((edge) => {
    if (edge.source === oldSourceId) edge.source = newSourceId;
    return edge;
  });
};

// Reassign edge target ids to new node id
const reassignEdgeTargets = (oldTargetId: string, newTargetId: string, graph: WorkflowNode) => {
  graph.edges = graph.edges?.map((edge) => {
    if (edge.target === oldTargetId) edge.target = newTargetId;
    return edge;
  });
};
