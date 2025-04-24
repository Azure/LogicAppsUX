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
  subgraphId?: string;
}

export interface ConnectionPanelContentState {
  isCreatingConnection: boolean;
  panelMode: 'Connection';
  selectedNodeIds: string[];
}

export type ActionPanelFavoriteItem = {
  connectorId: string;
  operationId?: string;
};

export interface DiscoveryPanelContentState {
  favoriteOperations: ActionPanelFavoriteItem[];
  isAddingTrigger: boolean;
  isParallelBranch: boolean;
  isAgentTool?: boolean;
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
  pinnedNodeActiveTabId?: string;
  selectedNodeId?: string;
  selectedNodeActiveTabId?: string;
}

export interface NodeSearchPanelContentState {
  panelMode: 'NodeSearch';
}

export interface WorkflowParametersPanelContentState {
  panelMode: 'WorkflowParameters';
}

export interface AssertionsPanelContentState {
  panelMode: 'Assertions';
}

export type PanelContentState =
  | ConnectionPanelContentState
  | DiscoveryPanelContentState
  | ErrorPanelContentState
  | OperationPanelContentState
  | NodeSearchPanelContentState
  | WorkflowParametersPanelContentState
  | AssertionsPanelContentState;

export type PanelMode = PanelContentState['panelMode'];

export const PANEL_MODE: Record<PanelMode, PanelMode> = {
  Operation: 'Operation',
  Discovery: 'Discovery',
  WorkflowParameters: 'WorkflowParameters',
  NodeSearch: 'NodeSearch',
  Error: 'Error',
  Connection: 'Connection',
  Assertions: 'Assertions',
};
