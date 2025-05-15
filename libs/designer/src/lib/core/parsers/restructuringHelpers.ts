/* eslint-disable no-param-reassign */
import constants from '../../common/constants';
import { isWorkflowOperationNode } from '../actions/bjsworkflow/serializer';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { containsIdTag, getRecordEntry, RUN_AFTER_STATUS, WORKFLOW_EDGE_TYPES } from '@microsoft/logic-apps-shared';

const defaultTransitionObject = {
  when: [RUN_AFTER_STATUS.SUCCEEDED],
};

///////////////////////////////////////////////////////////
// EDGES

export const addNewEdge = (state: WorkflowState, source: string, target: string, graph: WorkflowNode) => {
  const workflowEdge: WorkflowEdge = {
    id: `${source}-${target}`,
    source,
    target,
    type: WORKFLOW_EDGE_TYPES.TRANSITION_EDGE,
  };
  if (!graph?.edges) {
    graph.edges = [];
  }
  graph?.edges.push(workflowEdge);

  const sourceOp = getRecordEntry(state.operations, source) as any;
  if (sourceOp) {
    if (!sourceOp?.transitions) {
      sourceOp.transitions = {};
    }
    sourceOp.transitions = { ...sourceOp.transitions, [target]: defaultTransitionObject };
  }
};

export const removeEdge = (state: WorkflowState, sourceId: string, targetId: string, graph: WorkflowNode) => {
  if (!state) {
    return;
  }
  graph.edges = graph.edges?.filter((edge) => !(edge.source === sourceId && edge.target === targetId));
  const sourceTransitions = (getRecordEntry(state.operations, sourceId) as any)?.transitions;
  if (sourceTransitions) {
    delete sourceTransitions?.[targetId as any];
  }
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
export const reassignEdgeSources = (state: WorkflowState, oldSourceId: string, newSourceId: string, graph: WorkflowNode) => {
  if (!state) {
    return;
  }

  moveTransitionSource(state, oldSourceId, newSourceId);
  graph.edges = graph.edges?.map((edge) => {
    if (edge.source === oldSourceId) {
      setEdgeSource(edge, newSourceId);
    }
    return edge;
  });
};

// Reassign edge target ids to new node id
//   \|/   =>   \|/
//               |
export const reassignEdgeTargets = (state: WorkflowState, oldTargetId: string, newTargetId: string, graph: WorkflowNode) => {
  // Remove child edges
  removeEdge(state, oldTargetId, newTargetId, graph);

  // Remove would-be duplicate edges
  const parentIds = (graph.edges?.filter((edge) => edge.target === oldTargetId) ?? []).map((edge) => edge.source);
  parentIds.forEach((parentId) => {
    if (graph.edges?.some((aEdge) => aEdge.source === parentId && aEdge.target === newTargetId)) {
      removeEdge(state, parentId, newTargetId, graph);
    }
  });

  // Reassign edge target ids to new node id
  graph.edges = graph.edges?.map((edge) => {
    if (edge.target === oldTargetId) {
      setEdgeTarget(edge, newTargetId);
      moveTransitionTarget(state, edge.source, oldTargetId, newTargetId);
    }
    return edge;
  });
};

export const moveTransitionSource = (state: WorkflowState | undefined, oldSourceId: string, newSourceId: string) => {
  if (!state) {
    return;
  }
  const sourceTransition = (getRecordEntry(state.operations, oldSourceId) as any)?.transitions;
  if (sourceTransition) {
    (getRecordEntry(state.operations, newSourceId) as LogicAppsV2.ActionDefinition).transitions = sourceTransition;
    (getRecordEntry(state.operations, oldSourceId) as any).transitions = {};
  }
};

export const moveTransitionTarget = (state: WorkflowState | undefined, nodeId: string, oldTargetId: string, newTargetId: string) => {
  if (!getRecordEntry(state?.operations, nodeId)) {
    return;
  }
  const sourceTransition = (getRecordEntry(state?.operations, nodeId) as LogicAppsV2.ActionDefinition)?.transitions ?? {};
  if (!getRecordEntry(sourceTransition, newTargetId)) {
    sourceTransition[newTargetId] = getRecordEntry(sourceTransition, oldTargetId) ?? defaultTransitionObject;
  }

  delete sourceTransition[oldTargetId];

  if (Object.keys(sourceTransition).length !== 0) {
    (getRecordEntry(state?.operations, nodeId) as LogicAppsV2.ActionDefinition).transitions = sourceTransition;
  } else {
    delete (getRecordEntry(state?.operations, nodeId) as LogicAppsV2.ActionDefinition).transitions;
  }
};

export const applyIsRootNode = (state: WorkflowState, graph: WorkflowNode, metadata: NodesMetadata) => {
  const rootNodeIds: string[] =
    graph.edges?.reduce(
      (acc, edge) => {
        return containsIdTag(edge.source) ? acc : acc?.filter((id) => id !== edge.target);
      },
      graph.children?.filter((node) => isWorkflowOperationNode(node))?.map((node) => node.id) ?? []
    ) ?? [];

  (graph.children ?? []).forEach((node) => {
    const isRoot = node.id === constants.NODE.TYPE.PLACEHOLDER_TRIGGER ? true : (rootNodeIds?.includes(node.id) ?? false);
    const nodeMetadata = getRecordEntry(metadata, node.id);
    if (nodeMetadata) {
      nodeMetadata.isRoot = isRoot;
    }
  });
};
