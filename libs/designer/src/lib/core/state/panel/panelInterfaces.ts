import type { PanelTab } from '@microsoft/designer-ui';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
  isDiscovery: boolean;
  isParallelBranch: boolean;
  discoveryIds: IdsForDiscovery;
  registeredTabs: Record<string, PanelTab>;
  selectedTabName: string | undefined;
  selectedOperationGroupId: string;
}

export interface IdsForDiscovery {
  graphId: string;
  parentId?: string;
  childId?: string;
}
