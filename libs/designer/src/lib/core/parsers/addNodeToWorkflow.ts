/* eslint-disable no-param-reassign */
import type { NodesMetadata } from '../state/workflow/workflowSlice';
import type { WorkflowEdge, WorkflowNode } from './models/workflowNode';
import { WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from './models/workflowNode';

const getEdgeId = (parent: string, child: string) => `${parent}-${child}`;

export interface AddNodePayload {
  id: string;
  parentId?: string;
  childId?: string;
  graphId: string;
}

export const createNodeWithDefaultSize = (id: string): WorkflowNode => {
  return { id, height: 67, width: 200, type: WORKFLOW_NODE_TYPES.OPERATION_NODE };
};

export const addNodeToWorkflow = (payload: AddNodePayload, workflowGraph: WorkflowNode, nodesMetadata: NodesMetadata) => {
  addNodeMetadata(nodesMetadata, payload);
  const workflowNode: WorkflowNode = createNodeWithDefaultSize(payload.id);
  addWorkflowNode(workflowNode, workflowGraph);
};

const addNodeMetadata = (nodesMetadata: NodesMetadata, payload: AddNodePayload) => {
  nodesMetadata[payload.id] = { graphId: payload.graphId };
};

export const insertMiddleWorkflowEdge = (parent: string, current: string, child: string, graph: WorkflowNode): void => {
  const workflowEdge: WorkflowEdge = {
    id: getEdgeId(current, child),
    source: current,
    target: child,
    type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
  };
  if (!graph?.edges) graph.edges = [];
  graph.edges.push(workflowEdge);
  graph.edges = removeWorkflowEdge(parent, child, graph.edges);
};

export const addWorkflowNode = (node: WorkflowNode, graph: WorkflowNode): void => {
  graph.children = [...(graph?.children ?? []), node];
};

const removeWorkflowEdge = (parent: string, child: string, edges: WorkflowEdge[]): WorkflowEdge[] => {
  const parentEdge = edges.filter((edge) => edge.id !== getEdgeId(parent, child));
  return parentEdge;
};

export const setWorkflowEdge = (parent: string, child: string, graph: WorkflowNode) => {
  const workflowEdge: WorkflowEdge = {
    id: `${parent}-${child}`,
    source: parent,
    target: child,
    type: WORKFLOW_EDGE_TYPES.BUTTON_EDGE,
  };
  if (!graph?.edges) graph.edges = [];
  graph?.edges.push(workflowEdge);
};
