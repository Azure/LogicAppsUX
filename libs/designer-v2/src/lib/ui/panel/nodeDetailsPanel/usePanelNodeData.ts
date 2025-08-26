import type { AppDispatch } from '../../../core';
import { useNodeDisplayName, useNodeMetadata } from '../../../core';
import { ErrorLevel } from '../../../core/state/operation/operationMetadataSlice';
import { useIconUri, useOperationErrorInfo } from '../../../core/state/operation/operationSelector';
import { setPinnedPanelActiveTab, setSelectedPanelActiveTab } from '../../../core/state/panel/panelSlice';
import {
  useIsNodePinnedToOperationPanel,
  useOperationPanelAlternateNodeActiveTabId,
  useOperationPanelSelectedNodeActiveTabId,
} from '../../../core/state/panel/panelSelectors';
import { useOperationQuery } from '../../../core/state/selectors/actionMetadataSelector';
import { useNodeDescription, useRunData } from '../../../core/state/workflow/workflowSelectors';
import { usePanelTabs } from './usePanelTabs';
import type { PanelNodeData } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';

export const usePanelNodeData = (nodeId: string | undefined): PanelNodeData | undefined => {
  const nonNullNodeId = nodeId ?? '';

  const dispatch = useDispatch<AppDispatch>();

  const isPinnedNode = useIsNodePinnedToOperationPanel(nonNullNodeId);
  const comment = useNodeDescription(nonNullNodeId);
  const displayName = useNodeDisplayName(nonNullNodeId);
  const errorInfo = useOperationErrorInfo(nonNullNodeId);
  const iconUri = useIconUri(nonNullNodeId);
  const nodeMetadata = useNodeMetadata(nonNullNodeId);
  const runData = useRunData(nonNullNodeId);
  const tabs = usePanelTabs({ nodeId: nonNullNodeId });

  const opQuery = useOperationQuery(nonNullNodeId);

  const selectedNodeActiveTab = useOperationPanelSelectedNodeActiveTabId();
  const alternateNodeActiveTab = useOperationPanelAlternateNodeActiveTabId();

  if (!nodeId) {
    return undefined;
  }

  const selectedTab = isPinnedNode ? alternateNodeActiveTab : selectedNodeActiveTab;
  const selectTab = isPinnedNode ? setPinnedPanelActiveTab : setSelectedPanelActiveTab;
  const subgraphType = nodeMetadata?.subgraphType;
  const isError = errorInfo?.level === ErrorLevel.Critical || opQuery?.isError;

  return {
    comment,
    displayName,
    errorMessage: errorInfo?.message,
    iconUri,
    isError,
    isLoading: !isError && !subgraphType ? opQuery.isLoading : false,
    nodeId,
    onSelectTab: (tabId) => {
      dispatch(selectTab(tabId));
    },
    runData,
    selectedTab,
    subgraphType,
    tabs,
  };
};
