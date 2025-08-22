/* eslint-disable no-param-reassign */
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { removeEdge, reassignEdgeSources, reassignEdgeTargets } from './restructuringHelpers';
import { equals, getRecordEntry, type LogicAppsV2 } from '@microsoft/logic-apps-shared';

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

  const node = workflowGraph.children?.find((child: WorkflowNode) => child.id === nodeId);
  if (!node) {
    return;
  }
  // Delete all children first
  if (node?.children) {
    node.children.forEach((child: WorkflowNode) => {
      deleteNodeFromWorkflow({ nodeId: child.id, isTrigger: false }, node, nodesMetadata, state);
    });
  }

  const currentRunAfter = (getRecordEntry(state.operations, nodeId) as LogicAppsV2.ActionDefinition)?.runAfter;
  const multipleParents = Object.keys(currentRunAfter ?? {}).length > 1;

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

  const isAgent = equals(getRecordEntry(state.operations, nodeId)?.type, 'agent');
  if (isAgent) {
    const allAgents = Object.keys(state.operations).filter((opId) => equals(getRecordEntry(state.operations, opId)?.type, 'agent'));
    for (const sourceId of allAgents) {
      // Delete any handoff tools that are targetting the node
      const sourceToolIds = Object.entries((state.nodesMetadata[sourceId] as any)?.handoffs ?? {})
        .filter(([, targetId]) => targetId === nodeId)
        .map(([toolId, _]) => toolId);
      for (const sourceToolId of sourceToolIds) {
        const sourceNode = workflowGraph.children?.find((child: WorkflowNode) => child.id === sourceId);
        if (sourceNode) {
          deleteNodeFromWorkflow({ nodeId: sourceToolId, isTrigger: false }, sourceNode, nodesMetadata, state);
        }
        delete (state.nodesMetadata[sourceId] as any)?.handoffs[sourceToolId];
      }
    }
  }

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
    const parentMetadata = getRecordEntry(nodesMetadata, parentId);
    const isAfterTrigger = parentMetadata?.isTrigger;
    const allowRunAfterTrigger = equals(state.workflowKind, 'agent');
    const shouldAddRunAfters = allowRunAfterTrigger || (!isRoot && !isAfterTrigger);
    reassignEdgeSources(state, nodeId, parentId, workflowGraph, shouldAddRunAfters);
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
