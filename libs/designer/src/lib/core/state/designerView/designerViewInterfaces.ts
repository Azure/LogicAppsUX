export interface DesignerViewState {
  showMinimap?: boolean;
  clampPan?: boolean;
  showDeleteModalNodeId?: string;
  nodeContextMenuData?: NodeContextMenuObject;
  edgeContextMenuData?: EdgeContextMenuObject;
}

export interface NodeContextMenuObject {
  nodeId: string;
  location: { x: number; y: number };
}

export interface EdgeContextMenuObject {
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
  location: { x: number; y: number };
}
