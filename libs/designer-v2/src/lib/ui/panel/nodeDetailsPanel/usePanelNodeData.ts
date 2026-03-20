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
import { isBuiltInAgentTool } from '@microsoft/logic-apps-shared';

// SVG icon for built-in agent tools (code brackets icon: </>)
const BUILT_IN_TOOL_ICON_URI =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23424242'%3E%3Cpath d='M12.2 3.4a.75.75 0 0 0-1.4-.5l-3 8.5a.75.75 0 0 0 1.4.5l3-8.5zM5.8 5.2a.75.75 0 0 0-1.1 0L1.5 8.5a.75.75 0 0 0 0 1l3.2 3.3a.75.75 0 0 0 1.1-1L3.1 9l2.7-2.8a.75.75 0 0 0 0-1zM14.2 5.2a.75.75 0 0 1 1.1 0l3.2 3.3a.75.75 0 0 1 0 1l-3.2 3.3a.75.75 0 0 1-1.1-1L16.9 9l-2.7-2.8a.75.75 0 0 1 0-1z'/%3E%3C/svg%3E";

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

  // For built-in tools (like code_interpreter) that have runData but no operationInfo,
  // we don't need to wait for operation metadata to load
  const hasRunDataOnly = !!runData && !opQuery?.data;

  // Check if this is a built-in agent tool (like code_interpreter) and provide a default icon
  const isBuiltInTool = isBuiltInAgentTool(nonNullNodeId);
  const effectiveIconUri = iconUri || (isBuiltInTool ? BUILT_IN_TOOL_ICON_URI : '');

  return {
    comment,
    displayName,
    errorMessage: errorInfo?.message,
    iconUri: effectiveIconUri,
    isError,
    isLoading: !isError && !subgraphType && !hasRunDataOnly ? opQuery.isLoading : false,
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
