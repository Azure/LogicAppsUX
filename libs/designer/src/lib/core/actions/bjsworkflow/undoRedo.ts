import { createAsyncThunk } from '@reduxjs/toolkit';
import { deflateSync, inflateSync } from 'zlib';
import CONSTANTS from '../../../common/constants';
import { setStateAfterUndoRedo } from '../../state/global';
import { saveStateToHistory, updateStateHistoryOnRedoClick, updateStateHistoryOnUndoClick } from '../../state/undoRedo/undoRedoSlice';
import type { UndoRedoPartialRootState } from '../../state/undoRedo/undoRedoTypes';
import type { RootState } from '../../store';

export const storeStateToUndoRedoHistory = createAsyncThunk(
  'storeStateToUndoRedoHistory',
  async (_, { dispatch, getState }): Promise<void> => {
    const rootState = getState() as RootState;
    dispatch(
      saveStateToHistory({
        compressedState: getCompressedStateFromRootState(rootState),
        limit: rootState.designerOptions.hostOptions.maxStateHistorySize || CONSTANTS.DEFAULT_MAX_STATE_HISTORY_SIZE,
      })
    );
  }
);

export const onUndoClick = createAsyncThunk('onUndoClick', async (_, { dispatch, getState }): Promise<void> => {
  const currentRootState = getState() as RootState;
  const undoRedoState = currentRootState.undoRedo;
  if (undoRedoState.past.length < 1) {
    // Undo is not possible
    return;
  }

  // Change current state to previous state
  const previousCompressedState = undoRedoState.past[undoRedoState.past.length - 1];
  const decompressedState = getRootStateFromCompressedState(previousCompressedState);
  dispatch(setStateAfterUndoRedo(decompressedState));

  // Store current state to state history
  const compressedRootState = getCompressedStateFromRootState(currentRootState);
  dispatch(updateStateHistoryOnUndoClick(compressedRootState));
});

export const onRedoClick = createAsyncThunk('onRedoClick', async (_, { dispatch, getState }): Promise<void> => {
  const currentRootState = getState() as RootState;
  const undoRedoState = currentRootState.undoRedo;
  if (undoRedoState.future.length < 1) {
    // Redo is not possible
    return;
  }

  // Change current state to next state
  const nextCompressedState = undoRedoState.future[0];
  const decompressedState = getRootStateFromCompressedState(nextCompressedState);
  dispatch(setStateAfterUndoRedo(decompressedState));

  // Store current state to state history
  const compressedRootState = getCompressedStateFromRootState(currentRootState);
  dispatch(updateStateHistoryOnRedoClick(compressedRootState));
});

export const getCompressedStateFromRootState = (rootState: RootState) => {
  const partialRootState: UndoRedoPartialRootState = {
    connections: rootState.connections,
    customCode: rootState.customCode,
    operations: rootState.operations,
    panel: rootState.panel,
    panelV2: rootState.panelV2,
    settings: rootState.settings,
    staticResults: rootState.staticResults,
    tokens: rootState.tokens,
    workflow: rootState.workflow,
    workflowParameters: rootState.workflowParameters,
  };
  return deflateSync(JSON.stringify(partialRootState)).toString('base64');
};

export const getRootStateFromCompressedState = (compressedState: string) =>
  JSON.parse(inflateSync(Buffer.from(compressedState, 'base64')).toString()) as UndoRedoPartialRootState;
