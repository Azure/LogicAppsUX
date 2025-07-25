/* eslint-disable no-param-reassign */
import CONSTANTS from '../../common/constants';
import type { RelationshipIds } from '../state/panel/panelTypes';
import type { NodesMetadata, WorkflowState } from '../state/workflow/workflowInterfaces';
import { createWorkflowNode, createWorkflowEdge } from '../utils/graph';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import { reassignEdgeSources, reassignEdgeTargets, addNewEdge, applyIsRootNode, removeEdge } from './restructuringHelpers';
import type { DiscoveryOperation, DiscoveryResultTypes, LogicAppsV2, SubgraphType } from '@microsoft/logic-apps-shared';
import {
  removeIdTag,
  SUBGRAPH_TYPES,
  WORKFLOW_EDGE_TYPES,
  isScopeOperation,
  WORKFLOW_NODE_TYPES,
  getRecordEntry,
  equals,
} from '@microsoft/logic-apps-shared';

export interface AddNodePayload {
  operation: DiscoveryOperation<DiscoveryResultTypes>;
  nodeId: string;
  relationshipIds: RelationshipIds;
  isParallelBranch?: boolean;
  isTrigger?: boolean;
}

export const addNodeToWorkflow = (
  payload: AddNodePayload,
  workflowGraph: WorkflowNode,
  nodesMetadata: NodesMetadata,
  state: WorkflowState
) => {
  const { nodeId: newNodeId, operation, isParallelBranch, relationshipIds } = payload;
  const { graphId, subgraphId, parentId, childId } = relationshipIds;

  // Add Node Data
  const workflowNode: WorkflowNode = createWorkflowNode(newNodeId);

  // Handle Extra node addition if is a scope operation
  if (isScopeOperation(operation.type)) {
    handleExtraScopeNodeSetup(operation, workflowNode, nodesMetadata, state);
  }

  if (workflowNode.id) {
    workflowGraph.children = [...(workflowGraph?.children ?? []), workflowNode];
  }

  // Update metadata
  const isTrigger = !!operation.properties?.trigger;
  const isRoot = isTrigger || (parentId ? removeIdTag(parentId) === graphId : false);
  const parentNodeId = graphId !== 'root' ? graphId : undefined;
  nodesMetadata[newNodeId] = { graphId, parentNodeId, isRoot };

  state.operations[newNodeId] = { ...state.operations[newNodeId], type: operation.type };
  state.newlyAddedOperations[newNodeId] = newNodeId;
  state.isDirty = true;

  const isAfterTrigger = getRecordEntry(nodesMetadata, parentId ?? '')?.isRoot && graphId === 'root';
  const allowRunAfterTrigger = equals(state.workflowKind, 'agent');
  const shouldAddRunAfters = allowRunAfterTrigger || (!isRoot && !isAfterTrigger);
  nodesMetadata[newNodeId] = { graphId: subgraphId ?? graphId, parentNodeId, isRoot };
  state.operations[newNodeId] = { ...state.operations[newNodeId], type: operation.type };
  state.newlyAddedOperations[newNodeId] = newNodeId;

  // Parallel Branch creation, just add the singular node
  if (isParallelBranch && parentId) {
    addNewEdge(state, parentId, newNodeId, workflowGraph, shouldAddRunAfters);
  }
  // 1 parent, 1 child
  else if (parentId && childId) {
    const childRunAfter = (getRecordEntry(state.operations, childId) as any)?.runAfter;
    addNewEdge(state, parentId, newNodeId, workflowGraph, shouldAddRunAfters);
    addNewEdge(state, newNodeId, childId, workflowGraph, true);
    removeEdge(state, parentId, childId, workflowGraph);
    if (childRunAfter && shouldAddRunAfters) {
      (getRecordEntry(state.operations, newNodeId) as any).runAfter[parentId] = getRecordEntry(childRunAfter, parentId);
    }
  }
  // X parents, 1 child
  else if (childId) {
    reassignEdgeTargets(state, childId, newNodeId, workflowGraph);
    addNewEdge(state, newNodeId, childId, workflowGraph);
  }
  // 1 parent, X children
  else if (parentId) {
    reassignEdgeSources(state, parentId, newNodeId, workflowGraph);
    addNewEdge(state, parentId, newNodeId, workflowGraph, shouldAddRunAfters);
  }

  applyIsRootNode(state, workflowGraph, nodesMetadata);

  // Increase action count of graph
  if (nodesMetadata[workflowGraph.id]) {
    nodesMetadata[workflowGraph.id].actionCount = (nodesMetadata[graphId].actionCount ?? 0) + 1;
  }

  // If the added node is a do-until, we need to set the subgraphtype for the header
  if (operation.type.toLowerCase() === 'until') {
    nodesMetadata[newNodeId].subgraphType = SUBGRAPH_TYPES.UNTIL_DO;
  }
};

export const addChildNode = (graph: WorkflowNode, node: WorkflowNode): void => {
  graph.children = [...(graph?.children ?? []), node];
};
export const addChildEdge = (graph: WorkflowNode, edge: WorkflowEdge): void => {
  graph.edges = [...(graph?.edges ?? []), edge];
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
    parentNodeId: parent.id === 'root' ? undefined : parent.id,
  };
  addChildEdge(parent, createWorkflowEdge(`${parent.id}-#scope`, node.id, WORKFLOW_EDGE_TYPES.ONLY_EDGE));
};

const handleExtraScopeNodeSetup = (
  operation: DiscoveryOperation<DiscoveryResultTypes>,
  node: WorkflowNode,
  nodesMetadata: NodesMetadata,
  state: WorkflowState
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

  // Handle CONDITIONALS
  if (operation.type.toLowerCase() === CONSTANTS.NODE.TYPE.IF) {
    createSubgraphNode(node, `${node.id}-actions`, SUBGRAPH_TYPES.CONDITIONAL_TRUE, 'actions', nodesMetadata);
    createSubgraphNode(node, `${node.id}-elseActions`, SUBGRAPH_TYPES.CONDITIONAL_FALSE, 'else', nodesMetadata);
    state.operations[node.id] = {
      ...(getRecordEntry(state.operations, node.id) ?? ({} as any)),
      actions: {},
      else: {},
      expression: '',
    };
  }

  // Handle SWITCHES
  if (operation.type.toLowerCase() === CONSTANTS.NODE.TYPE.SWITCH) {
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
    const addCaseEdge = createWorkflowEdge(scopeHeadingId, addCaseGraphId, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE);
    addChildEdge(node, addCaseEdge);

    // DEFAULT GRAPH
    createSubgraphNode(node, `${node.id}-defaultCase`, SUBGRAPH_TYPES.SWITCH_DEFAULT as any, 'default', nodesMetadata);

    state.operations[node.id] = {
      ...(getRecordEntry(state.operations, node.id) ?? ({} as any)),
      cases: {},
      default: {},
      expression: '',
    };
  }

  // Handle Agent Loops

  if (operation.type.toLowerCase() === CONSTANTS.NODE.TYPE.AGENT) {
    // Add Case Graph
    const addCaseGraphId = `${node.id}-addCase`;
    const addCaseGraph = createWorkflowNode(addCaseGraphId, WORKFLOW_NODE_TYPES.HIDDEN_NODE);
    addCaseGraph.subGraphLocation = 'addCase';
    addChildNode(node, addCaseGraph);
    const addCaseGraphHeading = createWorkflowNode(`${addCaseGraphId}-#subgraph`, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE);
    addChildNode(addCaseGraph, addCaseGraphHeading);
    nodesMetadata[addCaseGraphId] = {
      graphId: node.id,
      subgraphType: SUBGRAPH_TYPES.AGENT_ADD_CONDITON,
      actionCount: 0,
    };
    const addCaseEdge = createWorkflowEdge(scopeHeadingId, addCaseGraphId, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE);
    addChildEdge(node, addCaseEdge);

    state.operations[node.id] = {
      ...(getRecordEntry(state.operations, node.id) ?? ({} as any)),
      cases: {},
      default: {},
      expression: '',
    };
  }

  if (operation.type.toLowerCase() === CONSTANTS.NODE.TYPE.UNTIL) {
    // Create Footer node
    const footerNode = createWorkflowNode(`${node.id}-#footer`, WORKFLOW_NODE_TYPES.SCOPE_CARD_NODE);
    addChildNode(node, footerNode);
    addChildEdge(node, createWorkflowEdge(scopeHeadingNode.id, footerNode.id, WORKFLOW_EDGE_TYPES.HIDDEN_EDGE));
  }
};

export const addSwitchCaseToWorkflow = (caseId: string, switchNode: WorkflowNode, nodesMetadata: NodesMetadata, state: WorkflowState) => {
  const caseNode = createWorkflowNode(caseId, WORKFLOW_NODE_TYPES.SUBGRAPH_NODE);
  caseNode.subGraphLocation = 'cases';
  // addChildNode(switchNode, caseNode);
  switchNode.children?.splice(switchNode.children.length - 2, 0, caseNode);
  const caseHeading = createWorkflowNode(`${caseId}-#subgraph`, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE);
  addChildNode(caseNode, caseHeading);
  nodesMetadata[caseId] = {
    graphId: switchNode.id,
    parentNodeId: switchNode.id,
    subgraphType: SUBGRAPH_TYPES.SWITCH_CASE,
    actionCount: 0,
  };
  addChildEdge(switchNode, createWorkflowEdge(`${switchNode.id}-#scope`, caseId, WORKFLOW_EDGE_TYPES.ONLY_EDGE));

  // Add Case to Switch operation data
  const switchAction = state.operations[switchNode.id] as LogicAppsV2.SwitchAction;
  switchAction.cases = {
    ...switchAction.cases,
    [caseId]: { actions: {}, case: '' },
  };

  // Increase action count of graph
  if (nodesMetadata[switchNode.id]) {
    nodesMetadata[switchNode.id].actionCount = (nodesMetadata[switchNode.id].actionCount ?? 0) + 1;
  }
};

export const addAgentToolToWorkflow = (toolId: string, agentNode: WorkflowNode, nodesMetadata: NodesMetadata, state: WorkflowState) => {
  const conditionNode = createWorkflowNode(toolId, WORKFLOW_NODE_TYPES.SUBGRAPH_NODE);
  conditionNode.subGraphLocation = 'tools';
  agentNode.children?.splice(agentNode.children.length - 2, 0, conditionNode);
  const conditionHeading = createWorkflowNode(`${toolId}-#subgraph`, WORKFLOW_NODE_TYPES.SUBGRAPH_CARD_NODE);
  addChildNode(conditionNode, conditionHeading);
  nodesMetadata[toolId] = {
    graphId: agentNode.id,
    parentNodeId: agentNode.id,
    subgraphType: SUBGRAPH_TYPES.AGENT_CONDITION,
    actionCount: 0,
  };
  addChildEdge(agentNode, createWorkflowEdge(`${agentNode.id}-#scope`, toolId, WORKFLOW_EDGE_TYPES.ONLY_EDGE));

  // Add Condion to Agent operation data
  const agentAction = state.operations[agentNode.id] as LogicAppsV2.AgentAction;
  agentAction.tools = {
    ...agentAction.tools,
    [toolId]: { actions: {}, description: '', type: 'Agent' },
  };

  // Increase action count of graph
  if (nodesMetadata[agentNode.id]) {
    nodesMetadata[agentNode.id].actionCount = (nodesMetadata[agentNode.id].actionCount ?? 0) + 1;
  }
};
