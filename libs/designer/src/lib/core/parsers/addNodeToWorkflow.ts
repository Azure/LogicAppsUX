/* eslint-disable no-param-reassign */
import type { NodesMetadata } from '../state/workflowSlice';
import type { WorkflowEdge, WorkflowGraph, WorkflowNode } from './models/workflowNode';

const getEdgeId = (parent: string, child: string) => `${parent}-${child}`;

export interface AddNodePayload {
  id: string;
  parentId?: string;
  childId?: string;
  graphId: string;
}

export const createNodeWithDefaultSize = (id: string): WorkflowNode => {
  return { id, height: 67, width: 200, type: 'testNode' }; // TODO: Assign correct type here
};

export const addNodeToWorkflow = (payload: AddNodePayload, workflowGraph: WorkflowGraph, nodesMetadata: NodesMetadata) => {
  addNodeMetadata(nodesMetadata, payload);
  const workflowNode: WorkflowNode = createNodeWithDefaultSize(payload.id);
  addWorkflowNode(workflowNode, workflowGraph);
};

const addNodeMetadata = (nodesMetadata: NodesMetadata, payload: AddNodePayload) => {
  nodesMetadata[payload.id] = { graphId: payload.graphId };
};

export const insertMiddleWorkflowEdge = (parent: string, current: string, child: string, graph: WorkflowGraph): void => {
  const workflowEdge: WorkflowEdge = {
    id: getEdgeId(current, child),
    source: current,
    target: child,
  };
  graph.edges.push(workflowEdge);
  graph.edges = removeWorkflowEdge(parent, child, graph.edges);
};

export const addWorkflowNode = (node: WorkflowNode, graph: WorkflowGraph): void => {
  graph?.children.push(node);
};

const removeWorkflowEdge = (parent: string, child: string, edges: WorkflowEdge[]): WorkflowEdge[] => {
  const parentEdge = edges.filter((edge) => edge.id !== getEdgeId(parent, child));
  return parentEdge;
};

export const setWorkflowEdge = (parent: string, child: string, graph: WorkflowGraph) => {
  const workflowEdge: WorkflowEdge = {
    id: `${parent}-${child}`,
    source: parent,
    target: child,
  };
  graph?.edges.push(workflowEdge);
};
