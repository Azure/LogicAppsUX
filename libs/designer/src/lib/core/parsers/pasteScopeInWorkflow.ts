import type { RelationshipIds } from '../state/panel/panelInterfaces';
import type { NodesMetadata, Operations, WorkflowState } from '../state/workflow/workflowInterfaces';
import type { WorkflowNode } from './models/workflowNode';
import { addNewEdge, reassignEdgeSources, reassignEdgeTargets, removeEdge, applyIsRootNode } from './restructuringHelpers';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
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
  newWorkflowGraph: WorkflowNode,
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

  // Update metadata
  Object.keys(operations).forEach((operation) => {
    state.operations[operation] = operations[operation];
  });
  Object.keys(nodesMetadata).forEach((metadata) => {
    state.nodesMetadata[metadata] = nodesMetadata[metadata];
  });
  allActions.forEach((action) => (state.newlyAddedOperations[action] = action));

  /////////////////////////////////////////////////////////
  // Add node to the new position in the graph

  // Add WorkflowNode copy
  newWorkflowGraph.children = [...(newWorkflowGraph?.children ?? []), workflowNode];

  // Update metadata
  const newGraphId = newWorkflowGraph.id;
  const isNewRoot = containsIdTag(parentId ?? '');
  const parentNodeId = newGraphId !== 'root' ? newGraphId : undefined;

  nodesMetadata[nodeId] = { ...getRecordEntry(nodesMetadata, nodeId), graphId: newGraphId, parentNodeId, isRoot: isNewRoot };
  if (getRecordEntry(nodesMetadata, nodeId)?.isRoot === false) delete nodesMetadata[nodeId].isRoot;

  const parentMetadata = getRecordEntry(nodesMetadata, parentId);
  const isAfterTrigger = (parentMetadata?.isRoot && newGraphId === 'root') ?? false;
  const shouldAddRunAfters = !isNewRoot && !isAfterTrigger;

  // clear the existing runAfter
  (getRecordEntry(state.operations, nodeId) as any).runAfter = {};
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

  if (isNewRoot && (getRecordEntry(state.operations, nodeId) as any)) delete (getRecordEntry(state.operations, nodeId) as any)?.runAfter;
  applyIsRootNode(state, newWorkflowGraph, nodesMetadata);

  // Increase action count of graph
  if (nodesMetadata?.[newWorkflowGraph.id]) {
    nodesMetadata[newWorkflowGraph.id].actionCount = (nodesMetadata[newWorkflowGraph.id].actionCount ?? 0) + 1;
  }
};
