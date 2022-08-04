import type { PanelTab } from '@microsoft/designer-ui';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
  isDiscovery: boolean;
  discoveryIds: IdsForDiscovery;
  registeredTabs: Record<string, PanelTab>;
  selectedTabName: string | undefined;
  selectedOperationGroupId: string;
}

export interface IdsForDiscovery {
  parentId?: string;
  childId?: string;
  graphId: string;
}
