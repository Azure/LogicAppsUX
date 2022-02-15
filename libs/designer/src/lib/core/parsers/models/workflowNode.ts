import { isObject } from '@microsoft-logic-apps/utils';

export interface WorkflowGraph {
  id: string;
  children: WorkflowNode[];
  edges: any[];
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

export const isWorkflowNode = (node: any): node is WorkflowNode => {
  return isObject(node) && typeof node.id === 'string' && typeof node.height === 'number' && typeof node.width === 'number';
};
