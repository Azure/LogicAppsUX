import type { RootState } from '../../store';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const getPanelState = (state: RootState) => state.panel;

export const useConnectionPanelSelectedNodeIds = () =>
  useSelector(createSelector(getPanelState, (state) => state.connectionContent.selectedNodeIds));

export const useCurrentPanelMode = () => useSelector(createSelector(getPanelState, (state) => state.currentPanelMode));

export const useDiscoveryPanelSelectedOperationGroupId = () =>
  useSelector(createSelector(getPanelState, (state) => state.discoveryContent.selectedOperationGroupId));

export const useDiscoveryPanelSelectedOperationId = () =>
  useSelector(createSelector(getPanelState, (state) => state.discoveryContent.selectedOperationId));

export const useDiscoveryPanelSelectedNodeIds = () =>
  useSelector(createSelector(getPanelState, (state) => state.discoveryContent.selectedNodeIds));

export const useDiscoveryPanelIsAddingTrigger = () =>
  useSelector(createSelector(getPanelState, (state) => state.discoveryContent.isAddingTrigger));

export const useDiscoveryPanelIsParallelBranch = () =>
  useSelector(createSelector(getPanelState, (state) => state.discoveryContent.isParallelBranch));

export const useDiscoveryPanelRelationshipIds = () =>
  useSelector(createSelector(getPanelState, (state) => state.discoveryContent.relationshipIds));

export const useDiscoveryPanelFavoriteOperations = () =>
  useSelector(createSelector(getPanelState, (state) => state.discoveryContent.favoriteOperations));

export const useDiscoveryPanelIsOperationFavorited = (connectorId: string, operationId?: string) =>
  useDiscoveryPanelFavoriteOperations().some((favorite) => favorite.connectorId === connectorId && favorite.operationId === operationId);

export const useErrorsPanelSelectedTabId = () => useSelector(createSelector(getPanelState, (state) => state.errorContent.selectedTabId));

export const useFocusReturnElementId = () => useSelector(createSelector(getPanelState, (state) => state.focusReturnElementId));

export const useIsCreatingConnection = () =>
  useSelector(createSelector(getPanelState, (state) => state.connectionContent.isCreatingConnection));

export const useIsPanelCollapsed = () => useSelector(createSelector(getPanelState, (state) => state.isCollapsed));

export const useIsPanelLoading = () => useSelector(createSelector(getPanelState, (state) => state.isLoading));

export const useIsNodePinnedToOperationPanel = (nodeId: string) =>
  useSelector(createSelector(getPanelState, (state) => (state.operationContent.pinnedNodeId ?? '') === nodeId));

export const useIsNodeSelectedInOperationPanel = (nodeId: string) =>
  useSelector(createSelector(getPanelState, (state) => (state.operationContent.selectedNodeId ?? '') === nodeId));

export const useIsPanelInPinnedViewMode = (): boolean => {
  const selectedNodeId = useOperationPanelSelectedNodeId();
  const pinnedNodeId = useOperationPanelPinnedNodeId();
  return !!(selectedNodeId && pinnedNodeId && pinnedNodeId !== selectedNodeId);
};

export const useOperationPanelPinnedNodeId = () =>
  useSelector(createSelector(getPanelState, (state) => state.operationContent.pinnedNodeId ?? ''));

export const useOperationPanelPinnedNodeActiveTabId = () =>
  useSelector(createSelector(getPanelState, (state) => state.operationContent.pinnedNodeActiveTabId));

export const useOperationPanelSelectedNodeId = () =>
  useSelector(createSelector(getPanelState, (state) => state.operationContent.selectedNodeId ?? ''));

export const useOperationPanelSelectedNodeActiveTabId = () =>
  useSelector(createSelector(getPanelState, (state) => state.operationContent.selectedNodeActiveTabId));

export const usePanelLocation = () => useSelector(createSelector(getPanelState, (state) => state.location));

export const usePreviousPanelMode = () => useSelector(createSelector(getPanelState, (state) => state.previousPanelMode));
