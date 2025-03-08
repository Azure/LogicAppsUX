import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { PanelTab } from './panelUtil';

export interface PanelNodeData {
  comment: string | undefined;
  displayName: string;
  errorMessage: string | undefined;
  iconUri: string;
  isError: boolean;
  isLoading: boolean;
  nodeId: string;
  onSelectTab: (tabId: string) => void;
  runData: LogicAppsV2.WorkflowRunAction | LogicAppsV2.WorkflowRunTrigger | undefined;
  selectedTab: string | undefined;
  subgraphType: string | undefined;
  tabs: PanelTab[];
}
