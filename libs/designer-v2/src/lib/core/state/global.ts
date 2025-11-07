import { resetCustomCode } from './customcode/customcodeSlice';
import { useIsWorkflowDirty, useWorkflowChangeCount } from './workflow/workflowSelectors';
import { setIsWorkflowDirty } from './workflow/workflowSlice';
import { setIsWorkflowParametersDirty } from './workflowparameters/workflowparametersSlice';
import { useIsWorkflowParametersDirty, useWorkflowParametersChangeCount } from './workflowparameters/workflowparametersselector';
import { createAction, createAsyncThunk } from '@reduxjs/toolkit';
import type { UndoRedoPartialRootState } from './undoRedo/undoRedoTypes';
import { useIsNotesDirty, useNotesChangeCount } from './notes/notesSelectors';
import { resetNoteDirty } from './notes/notesSlice';

export const resetWorkflowState = createAction('resetWorkflowState');
export const resetNodesLoadStatus = createAction('resetNodesLoadStatus');
export const setStateAfterUndoRedo = createAction<UndoRedoPartialRootState>('setStateAfterUndoRedo');
export const resetTemplatesState = createAction('resetTemplatesState');
export const resetMcpState = createAction('resetMcpState');

export const useIsDesignerDirty = () => {
  const isWorkflowDirty = useIsWorkflowDirty();
  const isWorkflowParametersDirty = useIsWorkflowParametersDirty();
  const isNotesDirty = useIsNotesDirty();
  return isWorkflowDirty || isWorkflowParametersDirty || isNotesDirty;
};

export const resetDesignerDirtyState = createAsyncThunk('resetDesignerDirtyState', async (_: unknown, thunkAPI: any) => {
  const dispatch = thunkAPI.dispatch;
  dispatch(setIsWorkflowDirty(false));
  dispatch(setIsWorkflowParametersDirty(false));
  dispatch(resetCustomCode());
  dispatch(resetNoteDirty(false));
});

export const useChangeCount = () => {
  const workflowChangeCount = useWorkflowChangeCount();
  const workflowParametersChangeCount = useWorkflowParametersChangeCount();
  const notesChangeCount = useNotesChangeCount();
  return workflowChangeCount + workflowParametersChangeCount + notesChangeCount;
};
