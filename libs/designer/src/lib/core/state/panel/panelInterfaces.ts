import type { PanelTab } from '@microsoft/designer-ui';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
  currentState?: 'Discovery' | 'WorkflowParameters' | 'NodeSearch';
  isParallelBranch: boolean;
  relationshipIds: RelationshipIds;
  registeredTabs: Record<string, PanelTab>;
  selectedTabName: string | undefined;
  selectedOperationGroupId: string;
  selectedOperationId: string;
  addingTrigger: boolean;
  tokenPickerVisibility: boolean;
}

export interface RelationshipIds {
  graphId: string;
  parentId?: string;
  childId?: string;
}
