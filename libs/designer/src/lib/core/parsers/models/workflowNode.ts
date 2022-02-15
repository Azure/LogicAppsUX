import { isNullOrUndefined } from '@microsoft-logic-apps/utils';

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

export const isWorkflowNode = (node: WorkflowGraph | WorkflowNode): node is WorkflowNode => {
  const n = node as WorkflowNode;
  return !isNullOrUndefined(n.height) && !isNullOrUndefined(n.width);
};
