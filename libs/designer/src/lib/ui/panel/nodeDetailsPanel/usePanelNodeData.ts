import type { AppDispatch } from '../../../core';
import { useNodeDisplayName, useNodeMetadata } from '../../../core';
import { ErrorLevel } from '../../../core/state/operation/operationMetadataSlice';
import { useIconUri, useOperationErrorInfo } from '../../../core/state/operation/operationSelector';
import { selectPanelTab } from '../../../core/state/panel/panelSlice';
import { useIsNodePinned, usePinnedNodeActiveTabId, useSelectedNodeActiveTabId } from '../../..//core/state/panelV2/panelSelectors';
import { setPinnedPanelActiveTab } from '../../../core/state/panelV2/panelSlice';
import { useOperationQuery } from '../../../core/state/selectors/actionMetadataSelector';
import { useNodeDescription, useRunData } from '../../../core/state/workflow/workflowSelectors';
import { usePanelTabs } from './usePanelTabs';
import type { PanelContainerNodeData } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';

export const usePanelNodeData = (nodeId: string | undefined): PanelContainerNodeData | undefined => {
  const nonNullNodeId = nodeId ?? '';

  const dispatch = useDispatch<AppDispatch>();

  const isPinnedNode = useIsNodePinned(nonNullNodeId);
  const comment = useNodeDescription(nonNullNodeId);
  const displayName = useNodeDisplayName(nonNullNodeId);
  const errorInfo = useOperationErrorInfo(nonNullNodeId);
  const iconUri = useIconUri(nonNullNodeId);
  const nodeMetaData = useNodeMetadata(nonNullNodeId);
  const runData = useRunData(nonNullNodeId);
  const tabs = usePanelTabs({ nodeId: nonNullNodeId });

  const opQuery = useOperationQuery(nonNullNodeId);

  const selectedNodeActiveTab = useSelectedNodeActiveTabId();
  const pinnedNodeActiveTab = usePinnedNodeActiveTabId();

  if (!nodeId) {
    return undefined;
  }

  const selectedTab = isPinnedNode ? pinnedNodeActiveTab : selectedNodeActiveTab;
  const selectTab = isPinnedNode ? setPinnedPanelActiveTab : selectPanelTab;

  return {
    comment,
    displayName,
    errorMessage: errorInfo?.message,
    iconUri,
    isError: errorInfo?.level === ErrorLevel.Critical || opQuery?.isError,
    isLoading: nodeMetaData?.subgraphType ? false : opQuery.isLoading,
    nodeId,
    onSelectTab: (tabId) => {
      dispatch(selectTab(tabId));
    },
    runData,
    selectedTab,
    tabs,
  };
};
