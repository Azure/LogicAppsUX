import { storeStateToUndoRedoHistory } from '../actions/bjsworkflow/undoRedo';
import { isExpressionConnectionMapping } from '../../common/models/workflow';
import { undoableActionTypes } from '../state/undoRedo/undoRedoTypes';
import { renameConnectionExpressionParameter } from '../state/connection/connectionSlice';
import type { RootState } from '../store';
import type { Middleware } from '@reduxjs/toolkit';

export const storeStateHistoryMiddleware: Middleware =
  ({ dispatch, getState }) =>
  (next) =>
  (action: any) => {
    if (
      action.type === 'updateNodeConnection/pending' &&
      !isExpressionConnectionMapping((getState() as RootState).connections.connectionsMapping[action.meta.arg.nodeId])
    ) {
      return next(action);
    }
    if (undoableActionTypes.includes(action.type)) {
      (dispatch as any)(storeStateToUndoRedoHistory(action));
    }
    if (action.type === 'workflowParameters/updateParameter') {
      const oldName = (getState() as RootState).workflowParameters.definitions[action.payload.id]?.name;
      const newName = action.payload.newDefinition.name;
      if (oldName && newName && oldName !== newName) {
        dispatch(renameConnectionExpressionParameter({ oldName, newName }));
      }
    }
    next(action);
  };
