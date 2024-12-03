import type { AppState } from './AppSlice';
import appReducer from './AppSlice';
import type { DataMapState } from './DataMapSlice';
import dataMapReducer from './DataMapSlice';
import type { FunctionState } from './FunctionSlice';
import functionReducer from './FunctionSlice';
import type { ModalState } from './ModalSlice';
import modalReducer from './ModalSlice';
import type { PanelState } from './PanelSlice';
import panelReducer from './PanelSlice';
import type { SchemaState } from './SchemaSlice';
import schemaReducer from './SchemaSlice';
import type { EnhancedStore } from '@reduxjs/toolkit';
import { configureStore } from '@reduxjs/toolkit';
import type { StateWithHistory } from 'redux-undo';
import undoable, { includeAction } from 'redux-undo';
import type {} from 'redux-thunk';
const includedActions = [
  'dataMap/doDataMapOperation',
  'dataMap/makeConnection',
  'dataMap/addFunctionNode',
  'dataMap/deleteCurrentlySelectedItem',
  'dataMap/setConnectionInput',
  'dataMap/addSourceSchemaNodes',
  'dataMap/removeSourceSchemaNodes',
];

type Reducers = {
  schema: SchemaState;
  function: FunctionState;
  panel: PanelState;
  modal: ModalState;
  dataMap: StateWithHistory<DataMapState>;
  app: AppState;
};

export const store: EnhancedStore<Reducers, any> = configureStore({
  reducer: {
    schema: schemaReducer,
    function: functionReducer,
    panel: panelReducer,
    modal: modalReducer,
    dataMap: undoable(dataMapReducer, {
      filter: includeAction(includedActions),
    }),
    app: appReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
