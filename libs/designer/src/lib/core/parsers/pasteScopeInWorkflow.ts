import type { RelationshipIds } from '../state/panel/panelInterfaces';
import type { NodesMetadata, Operations, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { addNewEdge, reassignEdgeSources, reassignEdgeTargets, removeEdge, applyIsRootNode } from './restructuringHelpers';
import { containsIdTag, getRecordEntry } from '@microsoft/logic-apps-shared';

export interface PasteScopeNodePayload {
  relationshipIds: RelationshipIds;
  scopeNode: WorkflowNode;
  operations: Operations;
  nodesMetadata: NodesMetadata;
  allActions: string[];
}

export const pasteScopeInWorkflow = (
  scopeNode: WorkflowNode,
  workflowGraph: WorkflowNode,
  relationshipIds: RelationshipIds,
  operations: Operations,
  nodesMetadata: NodesMetadata,
  allActions: string[],
  state: WorkflowState
) => {
  const nodeId = scopeNode.id;

  const { parentId, childId } = relationshipIds;

  let workflowNode: WorkflowNode | any = {};
  workflowNode = scopeNode;

  /////////////////////////////////////////////////////////
  // Add node to the new position in the graph

  // Add WorkflowNode copy
  workflowGraph.children = [...(workflowGraph?.children ?? []), workflowNode];

  // Update metadata
  Object.keys(operations).forEach((operation) => {
    state.operations[operation] = operations[operation];
  });
  Object.keys(nodesMetadata).forEach((metadata) => {
    state.nodesMetadata[metadata] = nodesMetadata[metadata];
  });
  allActions.forEach((action) => (state.newlyAddedOperations[action] = action));

  const newGraphId = workflowGraph.id;
  const isNewRoot = containsIdTag(parentId ?? '');
  const parentNodeId = newGraphId !== 'root' ? newGraphId : undefined;

  nodesMetadata[nodeId] = { ...getRecordEntry(nodesMetadata, nodeId), graphId: newGraphId, parentNodeId, isRoot: isNewRoot };
  if (getRecordEntry(nodesMetadata, nodeId)?.isRoot === false) {
    delete nodesMetadata[nodeId].isRoot;
  }

  const parentMetadata = getRecordEntry(state.nodesMetadata, parentId);
  const isAfterTrigger = (parentMetadata?.isRoot && newGraphId === 'root') ?? false;
  const shouldAddRunAfters = !isNewRoot && !isAfterTrigger;

  // clear the existing runAfter
  (getRecordEntry(state.operations, nodeId) as any).runAfter = {};
  // 1 parent, 1 child
  if (parentId && childId) {
    const childRunAfter = (getRecordEntry(state.operations, childId) as any)?.runAfter;
    addNewEdge(state, parentId, nodeId, workflowGraph, shouldAddRunAfters);
    addNewEdge(state, nodeId, childId, workflowGraph, true);
    removeEdge(state, parentId, childId, workflowGraph);
    if (childRunAfter && shouldAddRunAfters) {
      (getRecordEntry(state.operations, nodeId) as any).runAfter[parentId] = getRecordEntry(childRunAfter, parentId);
    }
  }
  // X parents, 1 child
  else if (childId) {
    reassignEdgeTargets(state, childId, nodeId, workflowGraph);
    addNewEdge(state, nodeId, childId, workflowGraph);
  }
  // 1 parent, X children
  else if (parentId) {
    reassignEdgeSources(state, parentId, nodeId, workflowGraph);
    addNewEdge(state, parentId, nodeId, workflowGraph, shouldAddRunAfters);
  }

  if (isNewRoot && (getRecordEntry(state.operations, nodeId) as any)) {
    delete (getRecordEntry(state.operations, nodeId) as any)?.runAfter;
  }
  applyIsRootNode(state, workflowGraph, nodesMetadata);

  // Increase action count of graph
  if (state.nodesMetadata?.[workflowGraph.id]) {
    state.nodesMetadata[workflowGraph.id].actionCount = (state.nodesMetadata[workflowGraph.id].actionCount ?? 0) + allActions.length - 1;
  }
};
