export interface DataMapDesignerGraph {
  id: string;
  parentNode: DataMapDesignerNode;
  edges: DataMapDesignerEdge[];
}

export interface DataMapDesignerNode {
  id: string;
  children?: DataMapDesignerGraph[];
  height: number;
  width: number;
}

export interface DataMapDesignerEdge {
  id: string;
  source: string;
  target: string;
}
