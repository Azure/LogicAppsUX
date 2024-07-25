import type { RootState } from '../../store';
import { createSelector } from '@reduxjs/toolkit';
import { useSelector } from 'react-redux';

const getPanelState = (state: RootState) => state.panelV2;

export const usePinnedNodeId = () => useSelector(createSelector(getPanelState, (state) => state.operationContent.pinnedNodeId ?? ''));

export const useIsNodePinned = (nodeId: string) => usePinnedNodeId() === nodeId;
