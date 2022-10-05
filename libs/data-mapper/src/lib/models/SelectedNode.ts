export enum NodeType {
  Source = 'source',
  Target = 'target',
  Function = 'function',
}

export interface SelectedNode {
  type: NodeType;
  id: string;
}
