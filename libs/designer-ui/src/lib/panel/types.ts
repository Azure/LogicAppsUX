import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import type { ReactNode } from 'react';
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
  /** Optional icon for a loaded operation; pending and error states use the existing header artwork. */
  operationIcon?: ReactNode;
}

export type SearchResultSortOption = 'unsorted' | 'ascending' | 'descending';
export const SearchResultSortOptions: Record<SearchResultSortOption, SearchResultSortOption> = {
  unsorted: 'unsorted',
  ascending: 'ascending',
  descending: 'descending',
};
