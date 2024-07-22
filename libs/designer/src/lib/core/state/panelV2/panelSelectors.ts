import type { RootState } from '../../store';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const getPanelState = (state: RootState) => state.panelV2;

export const useIsPanelCollapsed = () => useSelector(createSelector(getPanelState, (state) => state.isCollapsed));

export const useIsNodePinnedToOperationPanel = (nodeId: string) => useOperationPanelPinnedNodeId() === nodeId;

export const useOperationPanelPinnedNodeId = () =>
  useSelector(createSelector(getPanelState, (state) => state.operationContent.pinnedNodeId ?? ''));

export const useOperationPanelSelectedNodeId = () =>
  useSelector(createSelector(getPanelState, (state) => state.operationContent.selectedNodeId ?? ''));

export const useSelectedNodeActiveTabId = () =>
  useSelector(createSelector(getPanelState, (state) => state.operationContent.selectedNodeActiveTabId));

export const usePinnedNodeActiveTabId = () =>
  useSelector(createSelector(getPanelState, (state) => state.operationContent.pinnedNodeActiveTabId));
