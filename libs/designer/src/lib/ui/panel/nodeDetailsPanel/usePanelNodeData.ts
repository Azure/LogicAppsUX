import type { AppDispatch } from '../../../core';
import { useNodeDisplayName, useNodeMetadata } from '../../../core';
import { ErrorLevel } from '../../../core/state/operation/operationMetadataSlice';
import { useIconUri, useOperationErrorInfo } from '../../../core/state/operation/operationSelector';
import { useSelectedPanelTabId } from '../../../core/state/panel/panelSelectors';
import { selectPanelTab } from '../../../core/state/panel/panelSlice';
import { useOperationQuery } from '../../../core/state/selectors/actionMetadataSelector';
import { useNodeDescription, useRunData } from '../../../core/state/workflow/workflowSelectors';
import { usePanelTabs } from './usePanelTabs';
import type { PanelContainerNodeData } from '@microsoft/designer-ui';
import { useDispatch } from 'react-redux';

export const usePanelNodeData = (nodeId: string | undefined): PanelContainerNodeData | undefined => {
  const nonNullNodeId = nodeId ?? '';

  const dispatch = useDispatch<AppDispatch>();

  const comment = useNodeDescription(nonNullNodeId);
  const displayName = useNodeDisplayName(nonNullNodeId);
  const errorInfo = useOperationErrorInfo(nonNullNodeId);
  const iconUri = useIconUri(nonNullNodeId);
  const nodeMetaData = useNodeMetadata(nonNullNodeId);
  const runData = useRunData(nonNullNodeId);
  const tabs = usePanelTabs({ nodeId: nonNullNodeId });

  const opQuery = useOperationQuery(nonNullNodeId);

  const selectedTab = useSelectedPanelTabId();

  if (!nodeId) {
    return undefined;
  }

  return {
    comment,
    displayName,
    errorMessage: errorInfo?.message,
    iconUri,
    isError: errorInfo?.level === ErrorLevel.Critical || opQuery?.isError,
    isLoading: nodeMetaData?.subgraphType ? false : opQuery.isLoading,
    nodeId,
    onSelectTab: (tabId) => {
      dispatch(selectPanelTab(tabId));
    },
    runData,
    selectedTab,
    tabs,
  };
};
