import type { RootState } from '../../store';
import type { PanelState } from './panelInterfaces';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const getPanelState = (state: RootState) => state.panel;

export const useIsPanelCollapsed = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.collapsed));

export const useFocusReturnElementId = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.focusReturnElementId));

export const useCurrentPanelMode = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.currentPanelMode));

export const useReferencePanelMode = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.referencePanelMode));

export const useIsNodeSearchMode = () =>
  useSelector(createSelector(getPanelState, (state: PanelState) => state.currentPanelMode === 'NodeSearch'));

export const useIsAddingTrigger = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.addingTrigger));

export const useRelationshipIds = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.relationshipIds));

export const useIsParallelBranch = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.isParallelBranch));

export const useSelectedSearchOperationGroupId = () =>
  useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedOperationGroupId));

export const useSelectedSearchOperationId = () =>
  useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedOperationId));

export const useSelectedNodeId = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedNodes?.[0] ?? ''));
export const useSelectedNodeIds = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedNodes));

export const useIsNodeSelected = (nodeId: string) =>
  useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedNodes.includes(nodeId)));

export const useSelectedPanelTabId = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedTabId));

export const usePanelLocation = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.panelLocation));

export const useIsLoadingPanel = () => useSelector(createSelector(getPanelState, (state: PanelState) => !!state.isLoading));

export const useIsCreatingConnection = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.creatingConnection));

export const useSelectedErrorsPanelTabId = () =>
  useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedErrorsPanelTabId));
