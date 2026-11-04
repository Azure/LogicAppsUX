import { configureStore, createAction, type Middleware } from '@reduxjs/toolkit';
import type { MapMetadataV2 } from '@microsoft/logic-apps-shared';
import undoable, { includeAction } from 'redux-undo';
import app from '../../../../data-mapper-v2/src/core/state/AppSlice';
import dataMap, { saveDataMap, updateFunctionPosition } from '../../../../data-mapper-v2/src/core/state/DataMapSlice';
import errors from '../../../../data-mapper-v2/src/core/state/ErrorsSlice';
import functions from '../../../../data-mapper-v2/src/core/state/FunctionSlice';
import modal from '../../../../data-mapper-v2/src/core/state/ModalSlice';
import panel from '../../../../data-mapper-v2/src/core/state/PanelSlice';
import schema from '../../../../data-mapper-v2/src/core/state/SchemaSlice';
import { includedActionsForUndo } from '../../../../data-mapper-v2/src/core/state/Store';

export type SaveOperation = ReturnType<typeof dataMap>['curDataMapOperation'];
export const acknowledgeSave = createAction<{ operation: SaveOperation; metadata?: MapMetadataV2 }>('lml/saveAcknowledged');

const sameMap = (left: SaveOperation, right: SaveOperation) =>
  left.dataMapConnections === right.dataMapConnections &&
  left.functionNodes === right.functionNodes &&
  left.sourceSchema === right.sourceSchema &&
  left.targetSchema === right.targetSchema &&
  left.targetSchemaOrdering === right.targetSchemaOrdering;

const history = undoable(dataMap, { filter: includeAction(includedActionsForUndo) });
const editorDataMap: typeof history = (state, action) => {
  if (!state || !acknowledgeSave.match(action)) {
    const result = history(state, action);
    if (updateFunctionPosition.match(action) && state && result.present.curDataMapOperation !== state.present.curDataMapOperation) {
      return { ...result, present: { ...result.present, isDirty: true } };
    }
    return result;
  }
  const { operation, metadata } = action.payload;
  const saved = dataMap(
    { ...state.present, curDataMapOperation: { ...operation, loadedMapMetadata: metadata ?? operation.loadedMapMetadata } },
    saveDataMap({ sourceSchemaExtended: operation.sourceSchema, targetSchemaExtended: operation.targetSchema })
  );
  const applyBaseline = (present: typeof state.present) => ({
    ...present,
    pristineDataMap: saved.pristineDataMap,
    curDataMapOperation: { ...present.curDataMapOperation, loadedMapMetadata: saved.pristineDataMap.loadedMapMetadata },
    isDirty:
      !sameMap(present.curDataMapOperation, operation) || (present.isDirty && (present.sourceInEditState || present.targetInEditState)),
  });
  return {
    ...state,
    present: applyBaseline(state.present),
    past: state.past.map(applyBaseline),
    future: state.future.map(applyBaseline),
    _latestUnfiltered: applyBaseline(state._latestUnfiltered ?? state.present),
  };
};

const gateSave: Middleware = () => (next) => (action) => (saveDataMap.match(action) ? action : next(action));

export function createEditorStore() {
  return configureStore({
    middleware: (defaults) => defaults().concat(gateSave),
    reducer: {
      app,
      dataMap: editorDataMap,
      errors,
      function: functions,
      modal,
      panel,
      schema,
    },
  });
}
