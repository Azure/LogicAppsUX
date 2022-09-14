import type { PanelTab } from '@microsoft/designer-ui';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
  isDiscovery: boolean;
  isParallelBranch: boolean;
  relationshipIds: RelationshipIds;
  registeredTabs: Record<string, PanelTab>;
  selectedTabName: string | undefined;
  selectedOperationGroupId: string;
}

export interface RelationshipIds {
  graphId: string;
  parentId?: string;
  childId?: string;
}
