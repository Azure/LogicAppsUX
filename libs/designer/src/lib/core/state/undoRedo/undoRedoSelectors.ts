import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

export const useCanUndo = () => {
  return useSelector((state: RootState) => state.undoRedo.past.length > 0);
};

export const useCanRedo = () => {
  return useSelector((state: RootState) => state.undoRedo.future.length > 0);
};

export const useUndoRedoClickToggle = () => {
  return useSelector((state: RootState) => state.undoRedo.undoRedoClickToggle);
};
