/* eslint-disable no-param-reassign */
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import { isRootNodeInGraph } from '../utils/graph';
import type { WorkflowNode } from './models/workflowNode';
import { removeEdge, reassignEdgeSources, reassignEdgeTargets } from './restructuringHelpers';

export interface DeleteNodePayload {
  nodeId: string;
  isTrigger: boolean;
}

export const deleteNodeFromWorkflow = (
  payload: DeleteNodePayload,
  workflowGraph: WorkflowNode,
  nodesMetadata: NodesMetadata,
  state: WorkflowState
) => {
  if (!workflowGraph.id) throw new Error('Workflow graph is missing an id');
  const { nodeId, isTrigger } = payload;

  const currentRunAfter = (state.operations[nodeId] as LogicAppsV2.ActionDefinition)?.runAfter;
  const multipleParents = Object.keys(currentRunAfter ?? {}).length > 1;

  const isRoot = nodesMetadata[nodeId]?.isRoot;
  if (isRoot && !isTrigger) {
    const childIds = (workflowGraph.edges ?? []).filter((edge) => edge.source === nodeId).map((edge) => edge.target);
    childIds.forEach((childId) => (nodesMetadata[childId].isRoot = true));
  }

  // Nodes with multiple parents AND children are not allowed to be deleted

  // Adjust edges
  if (isTrigger) {
    workflowGraph.edges = (workflowGraph.edges ?? []).filter((edge) => edge.source !== nodeId);
  } else if (multipleParents) {
    const childId = (workflowGraph.edges ?? []).find((edge) => edge.source === nodeId)?.target ?? '';
    reassignEdgeTargets(state, nodeId, childId, workflowGraph);
    removeEdge(state, nodeId, childId, workflowGraph);
  } else {
    const parentId = (workflowGraph.edges ?? []).find((edge) => edge.target === nodeId)?.source ?? '';
    const isNewSourceTrigger = isRootNodeInGraph(parentId, 'root', state.nodesMetadata);
    reassignEdgeSources(state, nodeId, parentId, workflowGraph, /* isSourceTrigger */ false, isNewSourceTrigger);
    removeEdge(state, parentId, nodeId, workflowGraph);
  }

  // Delete Node Data
  deleteWorkflowNode(nodeId, workflowGraph);
  delete nodesMetadata[nodeId];
  delete state.operations[nodeId];
  delete state.newlyAddedOperations[nodeId];

  // Decrease action count of graph
  if (nodesMetadata[workflowGraph.id]) {
    nodesMetadata[workflowGraph.id].actionCount = (nodesMetadata[workflowGraph.id].actionCount ?? 1) - 1;
  }
};

export const deleteWorkflowNode = (nodeId: string, graph: WorkflowNode): void => {
  graph.children = (graph?.children ?? []).filter((child: WorkflowNode) => child.id !== nodeId);
};
