import type { PanelLocation } from '@microsoft/designer-ui';
import type { PanelState as PanelV2State } from './panelV2Types';

export type PanelMode = 'Operation' | 'Discovery' | 'WorkflowParameters' | 'NodeSearch' | 'Error' | 'Connection';

export interface PanelState {
  collapsed: boolean;
  selectedNodes: string[];
  currentPanelMode?: PanelMode;
  referencePanelMode?: PanelMode;
  panelLocation?: PanelLocation;
  isParallelBranch: boolean;
  relationshipIds: RelationshipIds;
  selectedTabId: string | undefined;
  selectedOperationGroupId: string;
  selectedOperationId: string;
  addingTrigger: boolean;
  isLoading?: boolean;
  focusReturnElementId?: string;
  creatingConnection?: boolean;
  selectedErrorsPanelTabId: string | undefined; // undefined will select first tab with > 0 messages
  panelV2: PanelV2State; // V2 will eventually replace this state, but is nested here for testing until then.
}

export interface RelationshipIds {
  graphId: string;
  parentId?: string;
  childId?: string;
}
