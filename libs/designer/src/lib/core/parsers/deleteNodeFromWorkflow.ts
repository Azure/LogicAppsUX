/* eslint-disable no-param-reassign */
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { removeEdge, reassignEdgeSources, reassignEdgeTargets } from './restructuringHelpers';

export interface DeleteNodePayload {
  nodeId: string;
  graphId: string;
}

export const deleteNodeFromWorkflow = (
  payload: DeleteNodePayload,
  workflowGraph: WorkflowNode,
  nodesMetadata: NodesMetadata,
  state: WorkflowState
) => {
  const { nodeId } = payload;

  const currentRunAfter = (state.operations[nodeId] as LogicAppsV2.ActionDefinition).runAfter;
  console.log('RunAfter', currentRunAfter);
  const multipleParents = Object.keys(currentRunAfter ?? {}).length > 1;

  // Nodes with multiple parents AND children are not allowed to be deleted

  // Adjust edges
  if (multipleParents) {
    const childId = (workflowGraph.edges ?? []).find((edge) => edge.source === nodeId)?.target ?? '';
    reassignEdgeTargets(state, nodeId, childId, workflowGraph);
    removeEdge(nodeId, childId, workflowGraph);
  } else {
    const parentId = (workflowGraph.edges ?? []).find((edge) => edge.target === nodeId)?.source ?? '';
    reassignEdgeSources(state, nodeId, parentId, workflowGraph);
    removeEdge(parentId, nodeId, workflowGraph);
  }

  // Delete Node Data
  deleteWorkflowNode(nodeId, workflowGraph);
  delete nodesMetadata[nodeId];
  delete state.operations[nodeId];
};

export const deleteWorkflowNode = (nodeId: string, graph: WorkflowNode): void => {
  graph.children = (graph?.children ?? []).filter((child: WorkflowNode) => child.id !== nodeId);
};
