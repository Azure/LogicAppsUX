/* eslint-disable no-param-reassign */
import constants from '../../common/constants';
import { isWorkflowOperationNode } from '../actions/bjsworkflow/serializer';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { containsIdTag, getRecordEntry, RUN_AFTER_STATUS, WORKFLOW_EDGE_TYPES } from '@microsoft/logic-apps-shared';

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

  const targetOp = getRecordEntry(state.operations, target) as any;
  if (targetOp && addRunAfter) {
    targetOp.runAfter = { ...targetOp.runAfter, [source]: [RUN_AFTER_STATUS.SUCCEEDED] };
  }
};

export const removeEdge = (state: WorkflowState, sourceId: string, targetId: string, graph: WorkflowNode) => {
  if (!state) return;
  graph.edges = graph.edges?.filter((edge) => !(edge.source === sourceId && edge.target === targetId));
  const targetRunAfter = (getRecordEntry(state.operations, targetId) as any)?.runAfter;
  if (targetRunAfter) delete targetRunAfter?.[sourceId as any];
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
  shouldHaveRunAfters = true
) => {
  if (!state) return;

  // Remove would-be duplicate edges
  const targetEdges = graph.edges?.filter((edge) => edge.source === oldSourceId) ?? [];
  if (targetEdges.length === 0) return;
  targetEdges.forEach((tEdge) => {
    if (graph.edges?.some((aEdge) => aEdge.source === newSourceId && aEdge.target === tEdge.target)) {
      removeEdge(state, oldSourceId, tEdge.target, graph);
      moveRunAfterSource(state, tEdge.target, oldSourceId, newSourceId, shouldHaveRunAfters);
    }
  });

  graph.edges = graph.edges?.map((edge) => {
    if (edge.source === oldSourceId) {
      setEdgeSource(edge, newSourceId);
      moveRunAfterSource(state, edge.target, oldSourceId, newSourceId, shouldHaveRunAfters);
    }
    return edge;
  });
};

// Reassign edge target ids to new node id
//   \|/   =>   \|/
//               |
export const reassignEdgeTargets = (state: WorkflowState, oldTargetId: string, newTargetId: string, graph: WorkflowNode) => {
  moveRunAfterTarget(state, oldTargetId, newTargetId);
  graph.edges = graph.edges?.map((edge) => {
    if (edge.target === oldTargetId) {
      setEdgeTarget(edge, newTargetId);
    }
    return edge;
  });
};

export const moveRunAfterTarget = (state: WorkflowState | undefined, oldTargetId: string, newTargetId: string) => {
  if (!state) return;
  const targetRunAfter = (getRecordEntry(state.operations, oldTargetId) as any)?.runAfter;
  if (targetRunAfter) {
    (getRecordEntry(state.operations, newTargetId) as LogicAppsV2.ActionDefinition).runAfter = targetRunAfter;
    (getRecordEntry(state.operations, oldTargetId) as any).runAfter = {};
  }
};

export const moveRunAfterSource = (
  state: WorkflowState | undefined,
  nodeId: string,
  oldSourceId: string,
  newSourceId: string,
  shouldHaveRunAfters: boolean
) => {
  if (!getRecordEntry(state?.operations, nodeId)) return;
  const targetRunAfter = (getRecordEntry(state?.operations, nodeId) as LogicAppsV2.ActionDefinition)?.runAfter ?? {};
  if (shouldHaveRunAfters && !getRecordEntry(targetRunAfter, newSourceId)) {
    targetRunAfter[newSourceId] = getRecordEntry(targetRunAfter, oldSourceId) ?? [RUN_AFTER_STATUS.SUCCEEDED];
  }

  delete targetRunAfter[oldSourceId];

  if (Object.keys(targetRunAfter).length !== 0) {
    (getRecordEntry(state?.operations, nodeId) as LogicAppsV2.ActionDefinition).runAfter = targetRunAfter;
  } else {
    delete (getRecordEntry(state?.operations, nodeId) as LogicAppsV2.ActionDefinition).runAfter;
  }
};

export const applyIsRootNode = (state: WorkflowState, graph: WorkflowNode, metadata: NodesMetadata) => {
  const rootNodeIds: string[] =
    graph.edges?.reduce(
      (acc, edge) => {
        return !containsIdTag(edge.source) ? acc?.filter((id) => id !== edge.target) : acc;
      },
      graph.children?.filter((node) => isWorkflowOperationNode(node))?.map((node) => node.id) ?? []
    ) ?? [];

  (graph.children ?? []).forEach((node) => {
    const isRoot = node.id === constants.NODE.TYPE.PLACEHOLDER_TRIGGER ? true : rootNodeIds?.includes(node.id) ?? false;
    const nodeMetadata = getRecordEntry(metadata, node.id);
    if (nodeMetadata) nodeMetadata.isRoot = isRoot;
    if (isRoot) delete (getRecordEntry(state.operations, node.id) as LogicAppsV2.ActionDefinition)?.runAfter;
  });
};
