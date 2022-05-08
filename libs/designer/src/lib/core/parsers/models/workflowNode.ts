import { isObject } from '@microsoft-logic-apps/utils';

export interface WorkflowGraph {
  id: string;
  children: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowNode {
  id: string;
  children?: WorkflowGraph[];
  height: number;
  width: number;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
}

export const setWorkflowEdge = (child: string, parent: string, graph: WorkflowGraph | null | undefined) => {
  // Danielle can I shorten this
  const workflowEdge: WorkflowEdge = {
    id: `${parent}-${child}`,
    source: parent,
    target: child,
  };
  graph?.edges.push(workflowEdge);
};

export const isWorkflowNode = (node: any): node is WorkflowNode => {
  return isObject(node) && typeof node.id === 'string' && typeof node.height === 'number' && typeof node.width === 'number';
};

export const isWorkflowGraph = (node: any): node is WorkflowGraph => {
  return isObject(node) && typeof node.id === 'string' && typeof node.children === 'object' && typeof node.edges === 'object';
};
