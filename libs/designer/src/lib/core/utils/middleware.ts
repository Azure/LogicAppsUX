import { storeStateToUndoRedoHistory } from '../actions/bjsworkflow/undoRedo';
import { undoableActionTypes } from '../state/undoRedo/undoRedoTypes';
import type { Middleware } from '@reduxjs/toolkit';

export const storeStateHistoryMiddleware: Middleware =
  ({ dispatch }) =>
  (next) =>
  (action: any) => {
    if (undoableActionTypes.includes(action.type)) {
      (dispatch as any)(storeStateToUndoRedoHistory(action));
    }
    next(action);
  };
