/* eslint-disable no-param-reassign */
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { removeEdge, reassignEdgeSources, reassignEdgeTargets } from './restructuringHelpers';
import { getRecordEntry, type LogicAppsV2 } from '@microsoft/logic-apps-shared';

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
  if (!workflowGraph.id) {
    throw new Error('Workflow graph is missing an id');
  }
  const { nodeId, isTrigger } = payload;

  const currentTransitions = (getRecordEntry(state.operations, nodeId) as LogicAppsV2.ActionDefinition)?.transitions;
  const childIds = Object.keys(currentTransitions ?? {});
  const multipleChildren = childIds.length > 1;
  const parentIds = (workflowGraph.edges ?? []).filter((edge) => edge.target === nodeId).map((edge) => edge.source);
  const multipleParents = parentIds.length > 1;

  const isRoot = getRecordEntry(nodesMetadata, nodeId)?.isRoot;
  if (isRoot && !isTrigger) {
    const childIds = (workflowGraph.edges ?? []).filter((edge) => edge.source === nodeId).map((edge) => edge.target);
    childIds.forEach((childId) => {
      const childMetadata = getRecordEntry(nodesMetadata, childId);
      if (childMetadata) {
        childMetadata.isRoot = true;
      }
    });
  }

  // Nodes with multiple parents AND children are not allowed to be deleted
  if (multipleParents && multipleChildren) {
    throw new Error('Node cannot be deleted because it has multiple parents and children');
  }

  // Adjust edges
  if (isTrigger) {
    workflowGraph.edges = (workflowGraph.edges ?? []).filter((edge) => edge.source !== nodeId);
  } else if (multipleParents) {
    const onlyChildId = childIds?.[0];
    if (onlyChildId) {
      reassignEdgeTargets(state, nodeId, onlyChildId, workflowGraph);
      removeEdge(state, nodeId, onlyChildId, workflowGraph);
    } else {
      parentIds.forEach((_parentId: string) => {
        removeEdge(state, _parentId, nodeId, workflowGraph);
      });
    }
  } else {
    const parentId = parentIds[0];
    reassignEdgeSources(state, nodeId, parentId, workflowGraph);
    removeEdge(state, parentId, nodeId, workflowGraph);
  }

  // Delete Node Data
  deleteWorkflowNode(nodeId, workflowGraph);
  delete nodesMetadata[nodeId];
  delete state.operations[nodeId];
  delete state.newlyAddedOperations[nodeId];
  delete state.idReplacements[nodeId];
  state.isDirty = true;

  // Decrease action count of graph
  const currentActionCount = getRecordEntry(nodesMetadata, workflowGraph.id)?.actionCount;
  if (currentActionCount) {
    nodesMetadata[workflowGraph.id].actionCount = (currentActionCount ?? 1) - 1;
  }
};

export const deleteWorkflowNode = (nodeId: string, graph: WorkflowNode): void => {
  graph.children = (graph?.children ?? []).filter((child: WorkflowNode) => child.id !== nodeId);
};
