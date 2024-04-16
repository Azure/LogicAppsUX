import type { RootState } from '../../store';
import { useSelector } from 'react-redux';

export const useShowMinimap = () => {
  return useSelector((state: RootState) => state.designerView.showMinimap);
};

export const useClampPan = () => {
  return useSelector((state: RootState) => state.designerView.clampPan);
};

export const useShowDeleteModal = () => {
  return useSelector((state: RootState) => state.designerView.showDeleteModal);
};
