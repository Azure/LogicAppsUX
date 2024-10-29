import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import { type AnyAction, createAsyncThunk } from '@reduxjs/toolkit';
import { default as CONSTANTS } from '../../../common/constants';
import { setStateAfterUndoRedo } from '../../state/global';
import { changePanelNode, setSelectedPanelActiveTab } from '../../state/panel/panelSlice';
import { saveStateToHistory, updateStateHistoryOnRedoClick, updateStateHistoryOnUndoClick } from '../../state/undoRedo/undoRedoSlice';
import type { RootState } from '../../store';
import {
  getCompressedStateFromRootState,
  getEditedPanelNode,
  getEditedPanelTab,
  getRootStateFromCompressedState,
  shouldSkipSavingStateToHistory,
} from '../../utils/undoredo';

export const storeStateToUndoRedoHistory = createAsyncThunk(
  'storeStateToUndoRedoHistory',
  async (action: AnyAction, { dispatch, getState }): Promise<void> => {
    const rootState = getState() as RootState;
    const stateHistoryLimit = rootState.designerOptions.hostOptions.maxStateHistorySize || CONSTANTS.DEFAULT_MAX_STATE_HISTORY_SIZE;
    const idReplacements = rootState.workflow.idReplacements;

    if (shouldSkipSavingStateToHistory(action, stateHistoryLimit, idReplacements)) {
      return;
    }

    try {
      const editedPanelTab = getEditedPanelTab(action.type);
      const editedPanelNode = getEditedPanelNode(action.type, rootState);
      const compressedState = getCompressedStateFromRootState(rootState);
      dispatch(
        saveStateToHistory({
          stateHistoryItem: { compressedState, editedPanelTab, editedPanelNode },
          limit: stateHistoryLimit,
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
    // Undo is not possible, button should not have been enabled
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'onUndoClick',
      message: 'Failed to undo. Past array is empty. Undo button should not be enabled.',
    });
    return;
  }

  const previousStateHistoryItem = undoRedoState.past[undoRedoState.past.length - 1];
  const previousDecompressedState = getRootStateFromCompressedState(previousStateHistoryItem.compressedState);
  const currentCompressedRootState = getCompressedStateFromRootState(currentRootState);

  // Change current state to previous state
  dispatch(setStateAfterUndoRedo(previousDecompressedState));

  // Store current state to state history
  dispatch(
    updateStateHistoryOnUndoClick({
      compressedState: currentCompressedRootState,
    })
  );

  // If the updates were panel related, change panel node and tab to the changed ones
  const panelNode = previousStateHistoryItem.editedPanelNode;
  if (panelNode) {
    dispatch(changePanelNode(panelNode));
  }
  const panelTab = previousStateHistoryItem.editedPanelTab;
  if (panelTab) {
    dispatch(setSelectedPanelActiveTab(panelTab));
  }
});

export const onRedoClick = createAsyncThunk('onRedoClick', async (_, { dispatch, getState }): Promise<void> => {
  const currentRootState = getState() as RootState;
  const undoRedoState = currentRootState.undoRedo;
  if (undoRedoState.future.length < 1) {
    // Redo is not possible, button should not have been enabled.
    LoggerService().log({
      level: LogEntryLevel.Error,
      area: 'onRedoClick',
      message: 'Failed to redo. Future array is empty. Redo button should not be enabled.',
    });
    return;
  }

  const nextStateHistoryItem = undoRedoState.future[0];
  const nextDecompressedState = getRootStateFromCompressedState(nextStateHistoryItem.compressedState);
  const currentCompressedRootState = getCompressedStateFromRootState(currentRootState);

  // Change current state to next state
  dispatch(setStateAfterUndoRedo(nextDecompressedState));

  // Store current state to state history
  dispatch(
    updateStateHistoryOnRedoClick({
      compressedState: currentCompressedRootState,
    })
  );

  // If the updates were panel related, change panel node and tab to the changed ones
  const panelNode = undoRedoState.currentEditedPanelNode;
  if (panelNode) {
    dispatch(changePanelNode(panelNode));
  }
  const panelTab = undoRedoState.currentEditedPanelTab;
  if (panelTab) {
    dispatch(setSelectedPanelActiveTab(panelTab));
  }
});
