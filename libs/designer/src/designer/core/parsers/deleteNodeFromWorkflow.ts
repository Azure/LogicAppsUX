/* eslint-disable no-param-reassign */
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { removeEdge, reassignEdgeSources, reassignEdgeTargets } from './restructuringHelpers';
import type { LogicAppsV2 } from '@microsoft/logic-apps-designer';

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
    childIds.forEach((childId) => {
      if (nodesMetadata[childId]) nodesMetadata[childId].isRoot = true;
    });
  }

  // Nodes with multiple parents AND children are not allowed to be deleted

  // Adjust edges
  if (isTrigger) {
    workflowGraph.edges = (workflowGraph.edges ?? []).filter((edge) => edge.source !== nodeId);
  } else if (multipleParents) {
    const childId = (workflowGraph.edges ?? []).find((edge) => edge.source === nodeId)?.target ?? '';
    if (childId) {
      reassignEdgeTargets(state, nodeId, childId, workflowGraph);
      removeEdge(state, nodeId, childId, workflowGraph);
    } else {
      Object.keys(currentRunAfter ?? {}).forEach((_parentId: string) => {
        removeEdge(state, _parentId, nodeId, workflowGraph);
      });
    }
  } else {
    const parentId = (workflowGraph.edges ?? []).find((edge) => edge.target === nodeId)?.source ?? '';
    const graphId = workflowGraph.id;
    const isAfterTrigger = nodesMetadata[parentId ?? '']?.isRoot && graphId === 'root';
    const shouldAddRunAfters = !isRoot && !isAfterTrigger;
    reassignEdgeSources(state, nodeId, parentId, workflowGraph, shouldAddRunAfters);
    removeEdge(state, parentId, nodeId, workflowGraph);
  }

  // Delete Node Data
  deleteWorkflowNode(nodeId, workflowGraph);
  delete nodesMetadata[nodeId];
  delete state.operations[nodeId];
  delete state.newlyAddedOperations[nodeId];
  state.isDirty = true;

  // Decrease action count of graph
  if (nodesMetadata[workflowGraph.id]) {
    nodesMetadata[workflowGraph.id].actionCount = (nodesMetadata[workflowGraph.id].actionCount ?? 1) - 1;
  }
};

export const deleteWorkflowNode = (nodeId: string, graph: WorkflowNode): void => {
  graph.children = (graph?.children ?? []).filter((child: WorkflowNode) => child.id !== nodeId);
};
