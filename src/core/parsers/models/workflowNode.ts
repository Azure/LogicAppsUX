export interface WorkflowNode {
  id: string;
  type: string;
  operation: LogicAppsV2.Operation;
  position: { x: number; y: number };
  size: { height: number; width: number };
  parentNodes: string[];
  childrenNodes: string[];
}

export interface ScopedNode extends WorkflowNode {
  subgraph_id: string;
}
