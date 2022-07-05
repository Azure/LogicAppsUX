export type WorkflowNodeType = 'GRAPH_NODE' | 'OPERATION_NODE' | 'SCOPE_NODE' | 'SUBGRAPH_NODE' | 'HIDDEN_NODE';
export const WORKFLOW_NODE_TYPES: Record<string, WorkflowNodeType> = {
  GRAPH_NODE: 'GRAPH_NODE',
  OPERATION_NODE: 'OPERATION_NODE',
  SCOPE_NODE: 'SCOPE_NODE',
  SUBGRAPH_NODE: 'SUBGRAPH_NODE',
  HIDDEN_NODE: 'HIDDEN_NODE',
};

export interface WorkflowNode {
  id: string;
  type: WorkflowNodeType;
  children?: WorkflowNode[];
  edges?: WorkflowEdge[]; // Graph nodes only
  height?: number; // Action nodes only
  width?: number; // Action Nodes only
}

export type WorkflowEdgeType = 'BUTTON_EDGE' | 'HEADING_EDGE' | 'ONLY_EDGE' | 'HIDDEN_EDGE';
export const WORKFLOW_EDGE_TYPES: Record<string, WorkflowEdgeType> = {
  BUTTON_EDGE: 'BUTTON_EDGE',
  HEADING_EDGE: 'HEADING_EDGE',
  ONLY_EDGE: 'ONLY_EDGE',
  HIDDEN_EDGE: 'HIDDEN_EDGE',
};

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  type: WorkflowEdgeType;
}

export const isWorkflowNode = (node: WorkflowNode) => node.type !== WORKFLOW_NODE_TYPES.GRAPH_NODE;
export const isWorkflowGraph = (node: WorkflowNode) => node.type === WORKFLOW_NODE_TYPES.GRAPH_NODE;
