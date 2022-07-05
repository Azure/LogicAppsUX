import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useIsNodeSelected = (nodeId: string) => {
  return useSelector((state: RootState) => state.panel.selectedNode === nodeId);
};
