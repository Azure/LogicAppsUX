export interface WorkflowNode {
  id: string;
  type: string;
  data: { label: string };
  position: { x: number; y: number };
  parentNodes: string[];
  childrenNodes: string[];
}

export interface ScopedNode extends WorkflowNode {
  subgraph_id: string;
}
