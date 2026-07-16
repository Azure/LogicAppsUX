import type { RootState } from '../../store';
import { canWrapSelectedNodes } from '../../utils/multiselect';
import type { OperationPanelContentState } from './panelTypes';
import { useSelector } from 'react-redux';

// Stable empty references shared by selectors that fall back to an empty value.
// Returning a freshly-allocated `[]` / `{}` from a selector makes react-redux's
// default `===` comparison fail on every dispatch, forcing consumers to re-render
// even when nothing they read has actually changed. Reusing a module-level singleton
// keeps the reference stable so those consumers only re-render when their data changes.
const emptySelectedNodeIds: string[] = [];
const emptyAlternateSelectedNode: NonNullable<OperationPanelContentState['alternateSelectedNode']> = {};

export const useConnectionPanelSelectedNodeIds = () => useSelector((state: RootState) => state.panel.connectionContent.selectedNodeIds);

export const useCurrentPanelMode = () => useSelector((state: RootState) => state.panel.currentPanelMode);

export const useDiscoveryPanelSelectedOperationGroupId = () =>
  useSelector((state: RootState) => state.panel.discoveryContent.selectedOperationGroupId);

export const useDiscoveryPanelSelectedOperationId = () =>
  useSelector((state: RootState) => state.panel.discoveryContent.selectedOperationId);

export const useDiscoveryPanelSelectedNodeIds = () => useSelector((state: RootState) => state.panel.discoveryContent.selectedNodeIds);

export const useDiscoveryPanelIsAddingTrigger = () => useSelector((state: RootState) => state.panel.discoveryContent.isAddingTrigger);

export const useDiscoveryPanelIsParallelBranch = () => useSelector((state: RootState) => state.panel.discoveryContent.isParallelBranch);

export const useDiscoveryPanelRelationshipIds = () => useSelector((state: RootState) => state.panel.discoveryContent.relationshipIds);

export const useDiscoveryPanelFavoriteOperations = () => useSelector((state: RootState) => state.panel.discoveryContent.favoriteOperations);

export const useDiscoveryPanelSelectedBrowseCategory = () =>
  useSelector((state: RootState) => state.panel.discoveryContent.selectedBrowseCategory);

export const useDiscoveryPanelSelectionState = () => useSelector((state: RootState) => state.panel.discoveryContent.selectionState);

export const useDiscoveryPanelIsOperationFavorited = (connectorId: string, operationId?: string) =>
  useDiscoveryPanelFavoriteOperations().some((favorite) => favorite.connectorId === connectorId && favorite.operationId === operationId);

export const useErrorsPanelSelectedTabId = () => useSelector((state: RootState) => state.panel.errorContent.selectedTabId);

export const useFocusReturnElementId = () => useSelector((state: RootState) => state.panel.focusReturnElementId);

export const useIsCreatingConnection = () => useSelector((state: RootState) => state.panel.connectionContent.isCreatingConnection);

export const useIsPanelCollapsed = () => useSelector((state: RootState) => state.panel.isCollapsed);

export const useIsPanelLoading = () => useSelector((state: RootState) => state.panel.isLoading);

export const useIsNodePinnedToOperationPanel = (nodeId: string) =>
  useSelector(
    (state: RootState) =>
      (state.panel.operationContent.alternateSelectedNode?.nodeId ?? '') === nodeId &&
      (state.panel.operationContent.alternateSelectedNode?.persistence ?? '') === 'pinned'
  );

export const useIsAlternateNodePinned = () =>
  useSelector((state: RootState) => (state.panel.operationContent.alternateSelectedNode?.persistence ?? '') === 'pinned');

export const useIsNodeSelectedInOperationPanel = (nodeId: string) =>
  useSelector((state: RootState) => (state.panel.operationContent.selectedNodeId ?? '') === nodeId);

export const useIsPanelInPinnedViewMode = (): boolean => {
  const selectedNodeId = useOperationPanelSelectedNodeId();
  const alternateSelectedNode = useOperationAlternateSelectedNodeId();
  return !!(selectedNodeId && alternateSelectedNode && alternateSelectedNode !== selectedNodeId);
};

export const useOperationAlternateSelectedNodeId = () =>
  useSelector((state: RootState) => state.panel.operationContent.alternateSelectedNode?.nodeId ?? '');

export const useOperationAlternateSelectedNode = () =>
  useSelector((state: RootState) => state.panel.operationContent.alternateSelectedNode ?? emptyAlternateSelectedNode);

export const useOperationPanelAlternateNodeActiveTabId = () =>
  useSelector((state: RootState) => state.panel.operationContent.alternateSelectedNode?.activeTabId);

export const useOperationPanelSelectedNodeId = () => useSelector((state: RootState) => state.panel.operationContent?.selectedNodeId ?? '');

export const useOperationPanelSelectedNodeIds = () =>
  useSelector((state: RootState) => state.panel.operationContent?.selectedNodeIds ?? emptySelectedNodeIds);

export const useCanWrapSelectedNodes = () =>
  useSelector((state: RootState) =>
    canWrapSelectedNodes(state.workflow, state.panel.operationContent?.selectedNodeIds ?? emptySelectedNodeIds)
  );

export const useIsNodeInMultiSelection = (nodeId: string) =>
  useSelector((state: RootState) => (state.panel.operationContent?.selectedNodeIds ?? emptySelectedNodeIds).includes(nodeId));

export const useOperationPanelSelectedNodeActiveTabId = () =>
  useSelector((state: RootState) => state.panel.operationContent.selectedNodeActiveTabId);

export const usePanelLocation = () => useSelector((state: RootState) => state.panel.location);

export const usePreviousPanelMode = () => useSelector((state: RootState) => state.panel.previousPanelMode);

export const useIsAddingAgentTool = () => useSelector((state: RootState) => state.panel.discoveryContent.isAddingAgentTool);

export const useDiscoveryPanelSearchTerm = () => useSelector((state: RootState) => state.panel.discoveryContent.searchTerm);

export const useIsRunHistoryCollapsed = () => useSelector((state: RootState) => state.panel.runHistoryCollapsed);

export const useMcpToolWizard = () => useSelector((state: RootState) => state.panel.discoveryContent.mcpToolWizard);

export const useMcpWizardStep = () => useSelector((state: RootState) => state.panel.discoveryContent.mcpToolWizard?.currentStep);

export const useMcpWizardOperation = () => useSelector((state: RootState) => state.panel.discoveryContent.mcpToolWizard?.operation);

export const useMcpWizardConnectionId = () => useSelector((state: RootState) => state.panel.discoveryContent.mcpToolWizard?.connectionId);

export const useMcpWizardAllowedTools = () => useSelector((state: RootState) => state.panel.discoveryContent.mcpToolWizard?.allowedTools);

export const useMcpWizardHeaders = () => useSelector((state: RootState) => state.panel.discoveryContent.mcpToolWizard?.headers);
