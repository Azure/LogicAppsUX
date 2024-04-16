/* eslint-disable no-param-reassign */
import type { RelationshipIds } from '../state/panel/panelInterfaces';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { addNewEdge, reassignEdgeSources, reassignEdgeTargets, removeEdge, applyIsRootNode } from './restructuringHelpers';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import { containsIdTag, getRecordEntry } from '@microsoft/logic-apps-shared';

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

  if (!oldWorkflowGraph.id) {
    throw new Error('Workflow graph is missing an id');
  }

  const { parentId, childId } = relationshipIds;

  const currentRunAfter = (getRecordEntry(state.operations, nodeId) as LogicAppsV2.ActionDefinition)?.runAfter;
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
  const isOldRoot = getRecordEntry(nodesMetadata, nodeId)?.isRoot;
  if (isOldRoot) {
    const childIds = (oldWorkflowGraph.edges ?? []).filter((edge) => edge.source === nodeId).map((edge) => edge.target);
    childIds.forEach((childId) => {
      const childMetadata = getRecordEntry(nodesMetadata, childId);
      if (childMetadata) {
        childMetadata.isRoot = true;
      }
      delete (getRecordEntry(state.operations, childId) as any)?.runAfter;
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
    const graphId = oldWorkflowGraph.id;
    const parentMetadata = getRecordEntry(nodesMetadata, parentId);
    const isAfterTrigger = parentMetadata?.isRoot && graphId === 'root';
    const shouldAddRunAfters = !isOldRoot && !isAfterTrigger;
    reassignEdgeSources(state, nodeId, parentId, oldWorkflowGraph, shouldAddRunAfters);
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
  const isNewRoot = containsIdTag(parentId ?? '');
  const parentNodeId = newGraphId !== 'root' ? newGraphId : undefined;

  nodesMetadata[nodeId] = { ...getRecordEntry(nodesMetadata, nodeId), graphId: newGraphId, parentNodeId, isRoot: isNewRoot };
  if (getRecordEntry(nodesMetadata, nodeId)?.isRoot === false) {
    delete nodesMetadata[nodeId].isRoot;
  }

  const parentMetadata = getRecordEntry(nodesMetadata, parentId);
  const isAfterTrigger = (parentMetadata?.isRoot && newGraphId === 'root') ?? false;
  const shouldAddRunAfters = !isNewRoot && !isAfterTrigger;

  // 1 parent, 1 child
  if (parentId && childId) {
    const childRunAfter = (getRecordEntry(state.operations, childId) as any)?.runAfter;
    addNewEdge(state, parentId, nodeId, newWorkflowGraph, shouldAddRunAfters);
    addNewEdge(state, nodeId, childId, newWorkflowGraph, true);
    removeEdge(state, parentId, childId, newWorkflowGraph);
    if (childRunAfter && shouldAddRunAfters) {
      (getRecordEntry(state.operations, nodeId) as any).runAfter[parentId] = getRecordEntry(childRunAfter, parentId);
    }
  }
  // X parents, 1 child
  else if (childId) {
    reassignEdgeTargets(state, childId, nodeId, newWorkflowGraph);
    addNewEdge(state, nodeId, childId, newWorkflowGraph);
  }
  // 1 parent, X children
  else if (parentId) {
    reassignEdgeSources(state, parentId, nodeId, newWorkflowGraph);
    addNewEdge(state, parentId, nodeId, newWorkflowGraph, shouldAddRunAfters);
  }

  if (isNewRoot && (getRecordEntry(state.operations, nodeId) as any)) {
    delete (getRecordEntry(state.operations, nodeId) as any)?.runAfter;
  }
  applyIsRootNode(state, newWorkflowGraph, nodesMetadata);

  state.isDirty = true;

  // Increase action count of graph
  if (nodesMetadata?.[newWorkflowGraph.id]) {
    nodesMetadata[newWorkflowGraph.id].actionCount = (nodesMetadata[newWorkflowGraph.id].actionCount ?? 0) + 1;
  }
};
