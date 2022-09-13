/* eslint-disable no-param-reassign */
import type { IdsForDiscovery } from '../state/panel/panelInterfaces';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import {
  addNewEdge,
  assignNodeRunAfterLeafNode,
  reassignEdgeSources,
  reassignEdgeTargets,
  reassignNodeRunAfter,
  removeEdge,
  resetIsRootNode,
} from './restructuringHelpers';

export interface MoveNodePayload {
  nodeId: string;
  oldGraphId: string;
  newGraphId: string;
  discoveryIds: IdsForDiscovery;
}

export const moveNodeInWorkflow = (
  currentNode: WorkflowNode,
  oldWorkflowGraph: WorkflowNode,
  newWorkflowGraph: WorkflowNode,
  discoveryIds: IdsForDiscovery,
  nodesMetadata: NodesMetadata,
  state: WorkflowState
) => {
  const nodeId = currentNode.id;

  if (!oldWorkflowGraph.id) throw new Error('Workflow graph is missing an id');

  const currentRunAfter = (state.operations[nodeId] as LogicAppsV2.ActionDefinition)?.runAfter;
  const multipleParents = Object.keys(currentRunAfter ?? {}).length > 1;
  const multipleChildren = (oldWorkflowGraph.edges ?? []).filter((edge) => edge.source === nodeId).length > 1;

  if (multipleParents && multipleChildren) {
    // Nodes with multiple parents AND children are not allowed to be deleted / moved
    console.error('Node with multiple parents and children cannot be moved');
    return;
  }

  let workflowNode: WorkflowNode | any = {};
  // Object.assign(workflowNode, currentNode);
  workflowNode = currentNode;

  /////////////////////////////////////////////////////////
  // Remove node from its current position in the graph

  const isOldRoot = nodesMetadata[nodeId]?.isRoot;
  if (isOldRoot) {
    const childIds = (oldWorkflowGraph.edges ?? []).filter((edge) => edge.source === nodeId).map((edge) => edge.target);
    childIds.forEach((childId) => (nodesMetadata[childId].isRoot = true));
  }

  // Adjust edges
  if (multipleParents) {
    const childId = (oldWorkflowGraph.edges ?? []).find((edge) => edge.source === nodeId)?.target ?? '';
    reassignEdgeTargets(state, nodeId, childId, oldWorkflowGraph);
    removeEdge(nodeId, childId, oldWorkflowGraph);
  } else {
    const parentId = (oldWorkflowGraph.edges ?? []).find((edge) => edge.target === nodeId)?.source ?? '';
    reassignEdgeSources(state, nodeId, parentId, oldWorkflowGraph);
    removeEdge(parentId, nodeId, oldWorkflowGraph);
  }

  // Delete WorkflowNode
  oldWorkflowGraph.children = (oldWorkflowGraph?.children ?? []).filter((child: WorkflowNode) => child.id !== nodeId);

  // Decrease action count of graph
  if (nodesMetadata?.[oldWorkflowGraph.id]) {
    nodesMetadata[oldWorkflowGraph.id].actionCount = (nodesMetadata[oldWorkflowGraph.id].actionCount ?? 1) - 1;
  }

  /////////////////////////////////////////////////////////
  // Add node to the new position in the graph

  // Add WorkflowNode copy
  addWorkflowNode(workflowNode, newWorkflowGraph);

  const { parentId, childId } = discoveryIds;

  // Update metadata
  const newGraphId = newWorkflowGraph.id;
  const isRoot = parentId?.split('-#')[0] === newGraphId;
  const parentNodeId = newGraphId !== 'root' ? newGraphId : undefined;

  nodesMetadata[nodeId] = { ...nodesMetadata[nodeId], graphId: newGraphId, parentNodeId, isRoot };
  if (nodesMetadata[nodeId].isRoot === false) delete nodesMetadata[nodeId].isRoot;

  // 1 parent and 1 child
  if (parentId && childId) {
    removeEdge(parentId, childId, newWorkflowGraph);
    addNewEdge(parentId, nodeId, newWorkflowGraph);
    addNewEdge(nodeId, childId, newWorkflowGraph);
    reassignNodeRunAfter(state, childId, parentId, nodeId);
  }
  // 1 parent, X children
  else if (parentId) {
    reassignEdgeSources(state, parentId, nodeId, newWorkflowGraph);
    addNewEdge(parentId, nodeId, newWorkflowGraph);
    assignNodeRunAfterLeafNode(state, parentId, nodeId);
  }
  // X parents, 1 child
  else if (childId) {
    reassignEdgeTargets(state, childId, nodeId, newWorkflowGraph);
    addNewEdge(nodeId, childId, newWorkflowGraph);
  }

  if (isRoot) {
    resetIsRootNode(state, nodeId, newWorkflowGraph, nodesMetadata);
    (state.operations[nodeId] as LogicAppsV2.ActionDefinition).runAfter = {};
  }

  // Increase action count of graph
  if (nodesMetadata?.[newWorkflowGraph.id]) {
    nodesMetadata[newWorkflowGraph.id].actionCount = (nodesMetadata[newWorkflowGraph.id].actionCount ?? 0) + 1;
  }
};

export const addWorkflowNode = (node: WorkflowNode, graph: WorkflowNode): void => {
  graph.children = [...(graph?.children ?? []), node];
};
