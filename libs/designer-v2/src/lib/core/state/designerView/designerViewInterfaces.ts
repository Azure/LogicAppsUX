export interface DesignerViewState {
  showMinimap?: boolean;
  clampPan?: boolean;
  showDeleteModalNodeId?: string;
  showMultiSelectDeleteModal?: boolean;
  workflowExtractionDialogOpen?: boolean;
  workflowExtractionBusy?: boolean;
  nodeContextMenuData?: NodeContextMenuObject;
  edgeContextMenuData?: EdgeContextMenuObject;
}

export interface NodeContextMenuObject {
  nodeId?: string;
  location: { x: number; y: number };
  entryPoint?: 'shared-lane-more';
}

export interface EdgeContextMenuObject {
  graphId: string;
  parentId?: string;
  childId?: string;
  isLeaf?: boolean;
  location: { x: number; y: number };
  isHandoff?: boolean;
  focusReturnElementId?: string;
}
