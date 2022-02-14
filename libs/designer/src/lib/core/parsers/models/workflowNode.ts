import { isNullOrUndefined } from '@microsoft-logic-apps/utils';

export interface WorkflowGraph {
  id: string;
  children: WorkflowNode[];
  edges: any[];
}

export interface WorkflowNode {
  id: string;
  children?: WorkflowGraph[];
  // type: string;
  height: number;
  width: number;
  // operation: LogicAppsV2.ActionDefinition | LogicAppsV2.Operation;
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
