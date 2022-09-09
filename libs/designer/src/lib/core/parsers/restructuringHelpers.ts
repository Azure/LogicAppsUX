/* eslint-disable no-param-reassign */
import type { WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import { RUN_AFTER_STATUS, WORKFLOW_EDGE_TYPES } from '@microsoft-logic-apps/utils';

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

export const removeEdge = (sourceId: string, targetId: string, graph: WorkflowNode) => {
  graph.edges = graph.edges?.filter((edge) => !(edge.source === sourceId && edge.target === targetId));
};

// Reassign edge source ids to new node id
//   |
//  /|\
export const reassignEdgeSources = (state: WorkflowState, oldSourceId: string, newSourceId: string, graph: WorkflowNode) => {
  graph.edges = graph.edges?.map((edge) => {
    if (edge.source === oldSourceId) {
      edge.source = newSourceId;
      if (state) reassignNodeRunAfter(state, edge.target, oldSourceId, newSourceId);
    }
    return edge;
  });
};

// Reassign edge target ids to new node id
//  \|/
//   |
export const reassignEdgeTargets = (state: WorkflowState, oldTargetId: string, newTargetId: string, graph: WorkflowNode) => {
  reassignAllNodeRunAfter(state, oldTargetId, newTargetId);
  graph.edges = graph.edges?.map((edge) => {
    if (edge.target === oldTargetId) {
      edge.target = newTargetId;
      // Remove RunAfter settings
      const runAfter = (state.operations[edge.source] as LogicAppsV2.ActionDefinition).runAfter;
      delete runAfter?.[oldTargetId];
    }
    return edge;
  });
};

export const reassignAllNodeRunAfter = (state: WorkflowState | undefined, oldNodeId: string, newNodeId: string) => {
  if (!state) return;
  const runAfter = (state.operations[oldNodeId] as LogicAppsV2.ActionDefinition).runAfter;
  state.operations[newNodeId] = { ...state.operations[newNodeId], runAfter };
  if (state.operations[oldNodeId]) (state.operations[oldNodeId] as any).runAfter = { [newNodeId]: ['Succeeded'] };
};

export const reassignNodeRunAfter = (state: WorkflowState | undefined, childNodeId: string, parentNodeId: string, newNodeId: string) => {
  if (!state) return;
  const childRunAfter = (state.operations[childNodeId] as LogicAppsV2.ActionDefinition)?.runAfter ?? {};
  if (state.operations[newNodeId]) {
    (state.operations[newNodeId] as any).runAfter = { [parentNodeId]: childRunAfter[parentNodeId] };
  }
  delete childRunAfter[parentNodeId];

  childRunAfter[newNodeId] = [RUN_AFTER_STATUS.SUCCEEDED];
};

export const reassignNodeRunAfterLeafNode = (state: WorkflowState | undefined, parentNodeId: string, newNodeId: string) => {
  if (!state) return;
  (state.operations[newNodeId] as LogicAppsV2.ActionDefinition).runAfter = { [parentNodeId]: [RUN_AFTER_STATUS.SUCCEEDED] };
};
