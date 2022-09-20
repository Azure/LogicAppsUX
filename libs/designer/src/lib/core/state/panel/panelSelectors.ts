import type { RootState } from '../../store';
import type { PanelState } from './panelInterfaces';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const getPanelState = (state: RootState) => state.panel;

export const useIsPanelCollapsed = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.collapsed));

export const useIsDiscovery = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.isDiscovery));

export const useRelationshipIds = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.relationshipIds));

export const useIsParallelBranch = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.isParallelBranch));

export const useSelectedOperationGroupId = () =>
  useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedOperationGroupId));

export const useSelectedNodeId = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedNode));

export const useIsNodeSelected = (nodeId: string) =>
  useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedNode === nodeId));

export const useRegisteredPanelTabs = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.registeredTabs));

export const usePanelTabByName = (tabName: string) =>
  useSelector(createSelector(getPanelState, (state: PanelState) => state.registeredTabs[tabName]));

export const useVisiblePanelTabs = () =>
  useSelector(
    createSelector(getPanelState, (state: PanelState) => {
      const visibleTabs = Object.values(state.registeredTabs).filter((tab) => tab.visible !== false);
      return visibleTabs.sort((a, b) => a.order - b.order);
    })
  );

export const useSelectedPanelTabName = () => useSelector(createSelector(getPanelState, (state: PanelState) => state.selectedTabName));

export const useSelectedPanelTab = () => {
  const selectedPanelTabName = useSelectedPanelTabName();
  return useSelector(createSelector(getPanelState, (state: PanelState) => state.registeredTabs[selectedPanelTabName ?? '']));
};
