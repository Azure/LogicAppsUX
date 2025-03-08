import { resetCustomCode } from './customcode/customcodeSlice';
import { useIsWorkflowDirty } from './workflow/workflowSelectors';
import { setIsWorkflowDirty } from './workflow/workflowSlice';
import { setIsWorkflowParametersDirty } from './workflowparameters/workflowparametersSlice';
import { useIsWorkflowParametersDirty } from './workflowparameters/workflowparametersselector';
import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { UndoRedoPartialRootState } from './undoRedo/undoRedoTypes';

export const resetWorkflowState = createAction('resetWorkflowState');
export const resetNodesLoadStatus = createAction('resetNodesLoadStatus');
export const setStateAfterUndoRedo = createAction<UndoRedoPartialRootState>('setStateAfterUndoRedo');

export const useIsDesignerDirty = () => {
  const isWorkflowDirty = useIsWorkflowDirty();
  const isWorkflowParametersDirty = useIsWorkflowParametersDirty();
  return isWorkflowDirty || isWorkflowParametersDirty;
};

export const resetDesignerDirtyState = createAsyncThunk('resetDesignerDirtyState', async (_: unknown, thunkAPI: any) => {
  const dispatch = thunkAPI.dispatch;
  dispatch(setIsWorkflowDirty(false));
  dispatch(setIsWorkflowParametersDirty(false));
  dispatch(resetCustomCode());
});
