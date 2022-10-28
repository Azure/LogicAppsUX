/* eslint-disable no-param-reassign */
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import { RUN_AFTER_STATUS, WORKFLOW_EDGE_TYPES } from '@microsoft-logic-apps/utils';

///////////////////////////////////////////////////////////
// EDGES

export const addNewEdge = (state: WorkflowState, source: string, target: string, graph: WorkflowNode, addRunAfter = true) => {
  const workflowEdge: WorkflowEdge = {
    id: `${source}-${target}`,
    source,
    target,
    type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
  };
  if (!graph?.edges) graph.edges = [];
  graph?.edges.push(workflowEdge);

  const targetOp = state.operations?.[target] as any;
  if (targetOp && addRunAfter) (state.operations?.[target] as any).runAfter = { [source]: [RUN_AFTER_STATUS.SUCCEEDED] };
};

export const removeEdge = (state: WorkflowState, sourceId: string, targetId: string, graph: WorkflowNode) => {
  if (!state) return;
  graph.edges = graph.edges?.filter((edge) => !(edge.source === sourceId && edge.target === targetId));
  const targetRunAfter = (state.operations?.[targetId] as any)?.runAfter;
  if (targetRunAfter) delete targetRunAfter.runAfter?.[sourceId as any];
};

const setEdgeSource = (edge: WorkflowEdge, newSource: string) => {
  edge.id = `${newSource}-${edge.target}`;
  edge.source = newSource;
};

const setEdgeTarget = (edge: WorkflowEdge, newTarget: string) => {
  edge.id = `${edge.source}-${newTarget}`;
  edge.target = newTarget;
};

///////////////////////////////////////////////////////////
// BULK FUNCTIONS

// Reassign edge source ids to new node id
//   /|\   =>   |
//             /|\
export const reassignEdgeSources = (
  state: WorkflowState,
  oldSourceId: string,
  newSourceId: string,
  graph: WorkflowNode,
  isOldSourceTrigger: boolean,
  isNewSourceTrigger: boolean
) => {
  if (!state) return;

  // Remove would-be duplicate edges
  const targetEdges = graph.edges?.filter((edge) => edge.source === oldSourceId) ?? [];
  targetEdges.forEach((tEdge) => {
    if (graph.edges?.some((aEdge) => aEdge.source === newSourceId && aEdge.target === tEdge.target)) {
      removeEdge(state, oldSourceId, tEdge.target, graph);
    }
  });

  graph.edges = graph.edges?.map((edge) => {
    if (edge.source === oldSourceId) {
      setEdgeSource(edge, newSourceId);
      moveRunAfterSource(state, edge.target, oldSourceId, newSourceId, isOldSourceTrigger, isNewSourceTrigger);
    }
    return edge;
  });
};

// Reassign edge target ids to new node id
//   \|/   =>   \|/
//               |
export const reassignEdgeTargets = (state: WorkflowState, oldTargetId: string, newTargetId: string, graph: WorkflowNode) => {
  // Remove would-be duplicate edges
  const targetEdges = graph.edges?.filter((edge) => edge.target === oldTargetId) ?? [];
  targetEdges.forEach((tEdge) => {
    if (graph.edges?.some((aEdge) => aEdge.source === tEdge.source && aEdge.target === newTargetId)) {
      removeEdge(state, tEdge.source, oldTargetId, graph);
    }
  });

  moveRunAfterTarget(state, oldTargetId, newTargetId);
  graph.edges = graph.edges?.map((edge) => {
    if (edge.target === oldTargetId) {
      setEdgeTarget(edge, newTargetId);
    }
    return edge;
  });
  // Remove duplicate edges
  graph.edges = [...new Set(graph.edges)];
};

const moveRunAfterTarget = (state: WorkflowState | undefined, oldTargetId: string, newTargetId: string) => {
  if (!state) return;
  const targetRunAfter = (state.operations?.[oldTargetId] as any)?.runAfter;
  if (targetRunAfter) {
    (state.operations[newTargetId] as LogicAppsV2.ActionDefinition).runAfter = targetRunAfter;
    (state.operations[oldTargetId] as any).runAfter = {};
  }
};

const moveRunAfterSource = (
  state: WorkflowState | undefined,
  nodeId: string,
  oldSourceId: string,
  newSourceId: string,
  isOldSourceTrigger: boolean,
  isNewSourceTrigger: boolean
) => {
  if (!state) return;
  const targetRunAfter = (state.operations[nodeId] as LogicAppsV2.ActionDefinition)?.runAfter ?? {};
  if (!isNewSourceTrigger) {
    targetRunAfter[newSourceId] = isOldSourceTrigger ? [RUN_AFTER_STATUS.SUCCEEDED] : targetRunAfter[oldSourceId];
  }

  delete targetRunAfter[oldSourceId];
};

export const applyIsRootNode = (state: WorkflowState, rootNodeId: string, graph: WorkflowNode, metadata: NodesMetadata) => {
  graph.edges?.forEach((edge) => {
    if (edge.source === rootNodeId)
      if (metadata?.[edge.target]) {
        delete metadata[edge.target].isRoot;
        (state.operations[edge.target] as LogicAppsV2.ActionDefinition).runAfter = {};
      }
  });
};
