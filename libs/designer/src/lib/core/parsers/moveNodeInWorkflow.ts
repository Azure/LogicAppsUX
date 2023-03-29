/* eslint-disable no-param-reassign */
import type { RelationshipIds } from '../state/panel/panelInterfaces';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import { isRootNodeInGraph } from '../utils/graph';
import type { WorkflowNode } from './models/workflowNode';
import { addNewEdge, reassignEdgeSources, reassignEdgeTargets, removeEdge, applyIsRootNode } from './restructuringHelpers';

export interface MoveNodePayload {
  nodeId: string;
  oldGraphId: string;
  newGraphId: string;
  relationshipIds: RelationshipIds;
}

export const moveNodeInWorkflow = (
  currentNode: WorkflowNode,
  oldWorkflowGraph: WorkflowNode,
  newWorkflowGraph: WorkflowNode,
  relationshipIds: RelationshipIds,
  nodesMetadata: NodesMetadata,
  state: WorkflowState
) => {
  const nodeId = currentNode.id;

  if (!oldWorkflowGraph.id) throw new Error('Workflow graph is missing an id');

  const { parentId, childId } = relationshipIds;

  const currentRunAfter = (state.operations[nodeId] as LogicAppsV2.ActionDefinition)?.runAfter;
  const multipleParents = Object.keys(currentRunAfter ?? {}).length > 1;
  const multipleChildren = (oldWorkflowGraph.edges ?? []).filter((edge) => edge.source === nodeId).length > 1;

  if (multipleParents && multipleChildren) {
    // Nodes with multiple parents AND children are not allowed to be deleted / moved
    console.error('Node with multiple parents and children cannot be moved');
    return;
  }

  let workflowNode: WorkflowNode | any = {};
  workflowNode = currentNode;

  /////////////////////////////////////////////////////////
  // Remove node from its current position in the graph

  // Set correct isRoot props
  const isOldRoot = nodesMetadata[nodeId]?.isRoot;
  if (isOldRoot) {
    const childIds = (oldWorkflowGraph.edges ?? []).filter((edge) => edge.source === nodeId).map((edge) => edge.target);
    childIds.forEach((childId) => {
      if (nodesMetadata[childId]) nodesMetadata[childId].isRoot = true;
      delete (state.operations[childId] as any)?.runAfter;
    });
  }

  // Adjust edges
  if (multipleParents) {
    const childId = (oldWorkflowGraph.edges ?? []).find((edge) => edge.source === nodeId)?.target ?? '';
    if (childId) {
      reassignEdgeTargets(state, nodeId, childId, oldWorkflowGraph);
      removeEdge(state, nodeId, childId, oldWorkflowGraph);
    } else {
      Object.keys(currentRunAfter ?? {}).forEach((_parentId: string) => {
        removeEdge(state, _parentId, nodeId, oldWorkflowGraph);
      });
    }
  } else {
    const parentId = (oldWorkflowGraph.edges ?? []).find((edge) => edge.target === nodeId)?.source ?? '';
    const isNewSourceTrigger = isRootNodeInGraph(parentId, 'root', state.nodesMetadata);
    reassignEdgeSources(state, nodeId, parentId, oldWorkflowGraph, /* isSourceTrigger */ false, isNewSourceTrigger);
    removeEdge(state, parentId, nodeId, oldWorkflowGraph);
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
  newWorkflowGraph.children = [...(newWorkflowGraph?.children ?? []), workflowNode];

  // Update metadata
  const newGraphId = newWorkflowGraph.id;
  const isNewRoot = parentId?.includes('-#');
  const parentNodeId = newGraphId !== 'root' ? newGraphId : undefined;

  nodesMetadata[nodeId] = { ...nodesMetadata[nodeId], graphId: newGraphId, parentNodeId, isRoot: isNewRoot };
  if (nodesMetadata[nodeId].isRoot === false) delete nodesMetadata[nodeId].isRoot;

  const isAfterTrigger = (nodesMetadata[parentId ?? '']?.isRoot && newGraphId === 'root') ?? false;
  const shouldAddRunAfters = !isNewRoot && !isAfterTrigger;

  // 1 parent, 1 child
  if (parentId && childId) {
    const childRunAfter = (state.operations?.[childId] as any)?.runAfter;
    addNewEdge(state, parentId, nodeId, newWorkflowGraph, shouldAddRunAfters);
    addNewEdge(state, nodeId, childId, newWorkflowGraph, true);
    removeEdge(state, parentId, childId, newWorkflowGraph);
    if (childRunAfter && shouldAddRunAfters) (state.operations?.[nodeId] as any).runAfter[parentId] = childRunAfter[parentId];
  }
  // X parents, 1 child
  else if (childId) {
    reassignEdgeTargets(state, childId, nodeId, newWorkflowGraph);
    addNewEdge(state, nodeId, childId, newWorkflowGraph);
  }
  // 1 parent, X children
  else if (parentId) {
    reassignEdgeSources(state, parentId, nodeId, newWorkflowGraph, isAfterTrigger, /* isNewSourceTrigger */ false);
    addNewEdge(state, parentId, nodeId, newWorkflowGraph, shouldAddRunAfters);
  }

  if (isNewRoot) {
    applyIsRootNode(state, nodeId, newWorkflowGraph, nodesMetadata);
    if (state.operations[nodeId] as any) delete (state.operations[nodeId] as any).runAfter;
  }

  // Increase action count of graph
  if (nodesMetadata?.[newWorkflowGraph.id]) {
    nodesMetadata[newWorkflowGraph.id].actionCount = (nodesMetadata[newWorkflowGraph.id].actionCount ?? 0) + 1;
  }
};
