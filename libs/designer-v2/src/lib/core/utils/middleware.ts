import { default as CONSTANTS } from '../../common/constants';
import { saveStateToHistory } from '../state/undoRedo/undoRedoSlice';
import { undoableActionTypes } from '../state/undoRedo/undoRedoTypes';
import type { RootState } from '../store';
import { getCompressedSlicesFromRootState, getEditedPanelNode, getEditedPanelTab, shouldSkipSavingStateToHistory } from './undoredo';
import { LogEntryLevel, LoggerService } from '@microsoft/logic-apps-shared';
import type { Middleware } from '@reduxjs/toolkit';

export const storeStateHistoryMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action: any) => {
    if (!undoableActionTypes.includes(action.type)) {
      return next(action);
    }

    // Capture pre-mutation state references (cheap — Immer won't mutate these in-place)
    const preState = getState() as RootState;

    // Process the action first so UI updates immediately
    const result = next(action);

    const stateHistoryLimit = preState.designerOptions.hostOptions.maxStateHistorySize ?? CONSTANTS.DEFAULT_MAX_STATE_HISTORY_SIZE;
    const idReplacements = preState.workflow.idReplacements;

    if (shouldSkipSavingStateToHistory(action, stateHistoryLimit, idReplacements)) {
      return result;
    }

    try {
      const editedPanelTab = getEditedPanelTab(action.type);
      const editedPanelNode = getEditedPanelNode(action.type, preState);
      const compressedSlices = getCompressedSlicesFromRootState(preState);
      dispatch(
        saveStateToHistory({
          stateHistoryItem: { compressedSlices, editedPanelTab, editedPanelNode },
          limit: stateHistoryLimit,
        })
      );
    } catch (error) {
      LoggerService().log({
        level: LogEntryLevel.Error,
        area: 'storeStateHistoryMiddleware',
        error: error instanceof Error ? error : undefined,
        message: 'Failed to save state to history for undo/redo.',
      });
    }

    return result;
  };
