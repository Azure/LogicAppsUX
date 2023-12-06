import type { PanelLocation, PanelTab } from '@microsoft/designer-ui';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
  currentState?: 'Operation' | 'Discovery' | 'WorkflowParameters' | 'NodeSearch' | 'Error' | 'Connection';
  panelLocation?: PanelLocation;
  isParallelBranch: boolean;
  relationshipIds: RelationshipIds;
  registeredTabs: Record<string, PanelTab>;
  selectedTabName: string | undefined;
  selectedOperationGroupId: string;
  selectedOperationId: string;
  addingTrigger: boolean;
  isLoading?: boolean;
  creatingConnection?: boolean;
}

export interface RelationshipIds {
  graphId: string;
  parentId?: string;
  childId?: string;
}
