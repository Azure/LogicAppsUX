import type { PanelLocation } from '@microsoft/designer-ui';

export interface PanelState {
  connectionContent: ConnectionPanelContentState;
  currentPanelMode: PanelMode;
  discoveryContent: DiscoveryPanelContentState;
  errorContent: ErrorPanelContentState;
  focusReturnElementId?: string;
  isCollapsed: boolean;
  isLoading: boolean;
  location: PanelLocation;
  nodeSearchContent: NodeSearchPanelContentState;
  operationContent: OperationPanelContentState;
  previousPanelMode: PanelMode | undefined;
  workflowParametersContent: WorkflowParametersPanelContentState;
}

export interface RelationshipIds {
  graphId: string;
  parentId?: string;
  childId?: string;
}

export interface ConnectionPanelContentState {
  isCreatingConnection: boolean;
  panelMode: 'Connection';
  selectedNodeIds: string[];
}

export interface DiscoveryPanelContentState {
  isAddingTrigger: boolean;
  isParallelBranch: boolean;
  panelMode: 'Discovery';
  relationshipIds: RelationshipIds;
  selectedNodeIds: string[];
  selectedOperationGroupId: string;
  selectedOperationId: string;
}

export interface ErrorPanelContentState {
  panelMode: 'Error';
  selectedTabId?: string;
}

export interface OperationPanelContentState {
  panelMode: 'Operation';
  pinnedNodeId?: string;
  selectedNodeId?: string;
  selectedTabId?: string;
}

export interface NodeSearchPanelContentState {
  panelMode: 'NodeSearch';
}

export interface WorkflowParametersPanelContentState {
  panelMode: 'WorkflowParameters';
}

export type PanelContentState =
  | ConnectionPanelContentState
  | DiscoveryPanelContentState
  | ErrorPanelContentState
  | OperationPanelContentState
  | NodeSearchPanelContentState
  | WorkflowParametersPanelContentState;

export type PanelMode = PanelContentState['panelMode'];
