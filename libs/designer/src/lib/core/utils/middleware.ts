import { isAction } from '@reduxjs/toolkit';
import { storeStateToUndoRedoHistory } from '../actions/bjsworkflow/undoRedo';
import { undoableActionTypes } from '../state/undoRedo/undoRedoTypes';
import type { ThunkMiddleware } from 'redux-thunk';

export const storeStateHistoryMiddleware: ThunkMiddleware =
  ({ dispatch }) =>
  (next) =>
  (action) => {
    if (isAction(action)) {
      if (undoableActionTypes.includes(action.type)) {
        dispatch(storeStateToUndoRedoHistory(action));
      }
      next(action);
    }
  };
