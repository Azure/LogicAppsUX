import type { WorkflowEdgeType, WorkflowNodeType } from '@microsoft/utils-logic-apps';
import { WORKFLOW_NODE_TYPES } from '@microsoft/utils-logic-apps';
import type { XYPosition } from 'reactflow';

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  subGraphLocation?: string;
  children?: WorkflowNode[];
  edges?: WorkflowEdge[]; // Graph nodes only
  height?: number; // Action nodes only
  width?: number; // Action Nodes only
}

export interface ReactFlowNodeInfo {
  height?: number; // Action nodes only
  width?: number; // Action Nodes only
  position?: XYPosition;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: WorkflowEdgeType;
}

export const isWorkflowNode = (node: WorkflowNode) =>
  node?.type && node.type !== WORKFLOW_NODE_TYPES.GRAPH_NODE && node.type !== WORKFLOW_NODE_TYPES.SUBGRAPH_NODE;

export const isWorkflowGraph = (node: WorkflowNode) => !isWorkflowNode(node);
