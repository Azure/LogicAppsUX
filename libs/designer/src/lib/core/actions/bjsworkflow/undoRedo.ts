import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { deflate, inflate } from 'pako';
import CONSTANTS from '../../../common/constants';
import { setStateAfterUndoRedo } from '../../state/global';
import { saveStateToHistory, updateStateHistoryOnRedoClick, updateStateHistoryOnUndoClick } from '../../state/undoRedo/undoRedoSlice';
import type { UndoRedoPartialRootState } from '../../state/undoRedo/undoRedoTypes';
import type { RootState } from '../../store';

export const storeStateToUndoRedoHistory = createAsyncThunk(
  'storeStateToUndoRedoHistory',
  async (_, { dispatch, getState }): Promise<void> => {
    const rootState = getState() as RootState;
    try {
      const compressedState = getCompressedStateFromRootState(rootState);
      dispatch(
        saveStateToHistory({
          compressedState,
          limit: rootState.designerOptions.hostOptions.maxStateHistorySize || CONSTANTS.DEFAULT_MAX_STATE_HISTORY_SIZE,
        })
      );
    } catch (error) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'storeStateToUndoRedoHistory',
        error: error instanceof Error ? error : undefined,
        message: 'Failed to save state to history for undo/redo',
      });
    }
  }
);

export const onUndoClick = createAsyncThunk('onUndoClick', async (_, { dispatch, getState }): Promise<void> => {
  const currentRootState = getState() as RootState;
  const undoRedoState = currentRootState.undoRedo;
  if (undoRedoState.past.length < 1) {
    // Undo is not possible, button should not be enabled
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'onUndoClick',
      message: 'Failed to undo. Past array is empty. Undo button should not be enabled.',
    });
    return;
  }

  try {
    const previousCompressedState = undoRedoState.past[undoRedoState.past.length - 1];
    const previousDecompressedState = getRootStateFromCompressedState(previousCompressedState);
    const currentCompressedRootState = getCompressedStateFromRootState(currentRootState);

    // Store current state to state history
    dispatch(updateStateHistoryOnUndoClick(currentCompressedRootState));

    // Change current state to previous state
    dispatch(setStateAfterUndoRedo(previousDecompressedState));
  } catch (error) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'onUndoClick',
      error: error instanceof Error ? error : undefined,
      message: 'Failed to undo',
    });
  }
});

export const onRedoClick = createAsyncThunk('onRedoClick', async (_, { dispatch, getState }): Promise<void> => {
  const currentRootState = getState() as RootState;
  const undoRedoState = currentRootState.undoRedo;
  if (undoRedoState.future.length < 1) {
    // Redo is not possible, button should not be enabled.
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'onRedoClick',
      message: 'Failed to redo. Future array is empty. Redo button should not be enabled.',
    });
    return;
  }

  try {
    const nextCompressedState = undoRedoState.future[0];
    const nextDecompressedState = getRootStateFromCompressedState(nextCompressedState);
    const currentCompressedRootState = getCompressedStateFromRootState(currentRootState);

    // Store current state to state history
    dispatch(updateStateHistoryOnRedoClick(currentCompressedRootState));

    // Change current state to next state
    dispatch(setStateAfterUndoRedo(nextDecompressedState));
  } catch (error) {
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'onRedoClick',
      error: error instanceof Error ? error : undefined,
      message: 'Failed to redo',
    });
  }
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
  return deflate(JSON.stringify(partialRootState));
};

export const getRootStateFromCompressedState = (compressedState: Uint8Array) =>
  JSON.parse(inflate(compressedState, { to: 'string' })) as UndoRedoPartialRootState;
