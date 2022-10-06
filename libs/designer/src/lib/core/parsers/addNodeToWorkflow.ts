/* eslint-disable no-param-reassign */
import CONSTANTS from '../../common/constants';
import type { RelationshipIds } from '../state/panel/panelInterfaces';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import { createWorkflowNode, createWorkflowEdge } from '../utils/graph';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import { reassignEdgeSources, reassignEdgeTargets, addNewEdge, applyIsRootNode } from './restructuringHelpers';
import type { DiscoveryOperation, DiscoveryResultTypes, SubgraphType } from '@microsoft-logic-apps/utils';
import { SUBGRAPH_TYPES, WORKFLOW_EDGE_TYPES, isScopeOperation, WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';

export interface AddNodePayload {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
  nodeId: string;
  relationshipIds: RelationshipIds;
  isParallelBranch?: boolean;
}

export const addNodeToWorkflow = (
  payload: AddNodePayload,
  workflowGraph: WorkflowNode,
  nodesMetadata: NodesMetadata,
  state: WorkflowState
) => {
  const { nodeId: newNodeId } = payload;
  const { graphId, parentId, childId } = payload.relationshipIds;

  // Add Node Data
  const workflowNode: WorkflowNode = createWorkflowNode(newNodeId);

  // Handle Extra node addition if is a scope operation
  if (isScopeOperation(payload.operation.type)) handleExtraScopeNodeSetup(payload.operation, workflowNode, nodesMetadata);

  if (workflowNode.id) workflowGraph.children = [...(workflowGraph?.children ?? []), workflowNode];

  // Update metadata
  const isRoot = parentId?.split('-#')[0] === graphId;
  const parentNodeId = graphId !== 'root' ? graphId : undefined;
  nodesMetadata[newNodeId] = { graphId, parentNodeId, ...(isRoot && { isRoot }) };

  state.operations[newNodeId] = { type: payload.operation.type };

  // Parallel Branch creation, just add the singular node
  if (payload.isParallelBranch && parentId) {
    addNewEdge(state, parentId, newNodeId, workflowGraph);
  }
  // X parents, 1 child
  else if (childId) {
    reassignEdgeTargets(state, childId, newNodeId, workflowGraph);
    addNewEdge(state, newNodeId, childId, workflowGraph);
  }
  // 1 parent, X children
  else if (parentId) {
    reassignEdgeSources(state, parentId, newNodeId, workflowGraph);
    addNewEdge(state, parentId, newNodeId, workflowGraph);
  }

  if (isRoot) applyIsRootNode(state, newNodeId, workflowGraph, nodesMetadata);

  // Increase action count of graph
  if (nodesMetadata[workflowGraph.id]) {
    nodesMetadata[workflowGraph.id].actionCount = nodesMetadata[graphId].actionCount ?? 0 + 1;
  }

  // If the added node is a do-until, we need to set the subgraphtype for the header
  if (payload.operation.type.toLowerCase() === 'until') nodesMetadata[newNodeId].subgraphType = SUBGRAPH_TYPES.UNTIL_DO;
};

export const addChildNode = (graph: WorkflowNode, node: WorkflowNode): void => {
  graph.children = [...(graph?.children ?? []), node];
};
export const addChildEdge = (graph: WorkflowNode, edge: WorkflowEdge): void => {
  graph.edges = [...(graph?.edges ?? []), edge];
};

const handleExtraScopeNodeSetup = (
  operation: DiscoveryOperation<DiscoveryResultTypes>,
  node: WorkflowNode,
  nodesMetadata: NodesMetadata
) => {
  node.type = WORKFLOW_NODE_TYPES.GRAPH_NODE;

  let scopeHeadingId = `${node.id}-#scope`;
  let scopeHeadingType = WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE;
  if (operation.type.toLowerCase() === CONSTANTS.NODE.TYPE.UNTIL) {
    scopeHeadingId = `${node.id}-#subgraph`;
    scopeHeadingType = WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE;
  }
  const scopeHeadingNode = createWorkflowNode(scopeHeadingId, scopeHeadingType);
  addChildNode(node, scopeHeadingNode);

  // Handle CONDITIONAL Subgraphs
  if (operation.type.toLowerCase() === CONSTANTS.NODE.TYPE.IF) {
    createSubgraphNode(node, `${node.id}-actions`, SUBGRAPH_TYPES.CONDITIONAL_TRUE, 'actions', nodesMetadata);
    createSubgraphNode(node, `${node.id}-elseActions`, SUBGRAPH_TYPES.CONDITIONAL_FALSE, 'else', nodesMetadata);
  }

  // Handle SWITCH Subgraphs
  if (operation.type.toLowerCase() === CONSTANTS.NODE.TYPE.SWITCH) {
    // DEFAULT GRAPH
    createSubgraphNode(node, `${node.id}-defaultCase`, SUBGRAPH_TYPES.SWITCH_DEFAULT as any, 'default', nodesMetadata);

    // Add Case Graph
    const addCaseGraphId = `${node.id}-addCase`;
    const addCaseGraph = createWorkflowNode(addCaseGraphId, WORKFLOW_NODE_TYPES.HIDDEN_NODE);
    addCaseGraph.subGraphLocation = 'addCase';
    addChildNode(node, addCaseGraph);
    const addCaseGraphHeading = createWorkflowNode(`${addCaseGraphId}-#subgraph`, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE);
    addChildNode(addCaseGraph, addCaseGraphHeading);
    nodesMetadata[addCaseGraphId] = {
      graphId: node.id,
      subgraphType: SUBGRAPH_TYPES.SWITCH_ADD_CASE as any,
      actionCount: 0,
    };

    // Edge assignment
    const addCaseEdge = createWorkflowEdge(scopeHeadingId, addCaseGraphHeading.id, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE);
    addChildEdge(node, addCaseEdge);
  }

  if (operation.type.toLowerCase() === CONSTANTS.NODE.TYPE.UNTIL) {
    // Create Footer node
    const footerNode = createWorkflowNode(`${node.id}-#footer`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE);
    addChildNode(node, footerNode);
    addChildEdge(node, createWorkflowEdge(scopeHeadingNode.id, footerNode.id, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE));
  }
};

const createSubgraphNode = (
  parent: WorkflowNode,
  id: string,
  subgraphType: SubgraphType,
  location: string,
  nodesMetadata: NodesMetadata
) => {
  const node = createWorkflowNode(id, WORKFLOW_NODE_TYPES.SUBGRAPH_NODE);
  node.subGraphLocation = location;
  addChildNode(parent, node);
  const graphHeading = createWorkflowNode(`${id}-#subgraph`, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE);
  addChildNode(node, graphHeading);
  nodesMetadata[id] = {
    graphId: parent.id,
    subgraphType,
    actionCount: 0,
  };
  addChildEdge(parent, createWorkflowEdge(`${parent.id}-#scope`, graphHeading.id, WORKFLOW_EDGE_TYPES.ONLY_EDGE));
};
