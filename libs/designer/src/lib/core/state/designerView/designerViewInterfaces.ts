export interface DesignerViewState {
  showMinimap?: boolean;
  clampPan?: boolean;
  showDeleteModalNodeId?: string;
  nodeContextMenuData?: ContextMenuObject;
}

export interface ContextMenuObject {
  nodeId: string;
  location: { x: number; y: number };
}
