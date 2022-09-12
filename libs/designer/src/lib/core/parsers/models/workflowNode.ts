import type { WorkflowEdgeType, WorkflowNodeType } from '@microsoft-logic-apps/utils';
import { WORKFLOW_NODE_TYPES } from '@microsoft-logic-apps/utils';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  subGraphLocation?: string;
  children?: WorkflowNode[];
  edges?: WorkflowEdge[]; // Graph nodes only
  height?: number; // Action nodes only
  width?: number; // Action Nodes only
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: WorkflowEdgeType;
}

export const isWorkflowNode = (node: WorkflowNode) =>
  node.type !== WORKFLOW_NODE_TYPES.GRAPH_NODE && node.type !== WORKFLOW_NODE_TYPES.SUBGRAPH_NODE;

export const isWorkflowGraph = (node: WorkflowNode) => !isWorkflowNode(node);
