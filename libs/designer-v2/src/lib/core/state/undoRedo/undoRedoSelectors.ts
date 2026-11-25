import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { isWorkflowEditLocked } from '../designerOptions/workflowEditLock';

export const useCanUndo = () => {
  return useSelector(
    (state: RootState) =>
      !isWorkflowEditLocked(state.designerOptions) && !state.undoRedo.activeHistoryTransactions && state.undoRedo.past.length > 0
  );
};

export const useCanRedo = () => {
  return useSelector(
    (state: RootState) =>
      !isWorkflowEditLocked(state.designerOptions) && !state.undoRedo.activeHistoryTransactions && state.undoRedo.future.length > 0
  );
};

export const useUndoRedoClickToggle = () => {
  return useSelector((state: RootState) => state.undoRedo.undoRedoClickToggle);
};
