import type { PanelTab } from '@microsoft/designer-ui';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
  isDiscovery: boolean;
  parentId?: string;
  childId?: string;
  registeredTabs: Record<string, PanelTab>;
  selectedTabName: string | undefined;
}
