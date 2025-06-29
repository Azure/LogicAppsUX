import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import type { NodePosition } from './nodePositionsSlice';

export const useManualNodePositions = (): Record<string, NodePosition> => {
  return useSelector((state: RootState) => state.nodePositions.manualPositions);
};

export const useIsManualMode = (): boolean => {
  return useSelector((state: RootState) => state.nodePositions.isManualMode);
};

export const useNodeManualPosition = (nodeId: string): NodePosition | undefined => {
  return useSelector((state: RootState) => state.nodePositions.manualPositions[nodeId]);
};
