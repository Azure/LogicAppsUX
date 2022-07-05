import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useMinimap = () => {
  return useSelector((state: RootState) => state.designerView.showMinimap);
};
