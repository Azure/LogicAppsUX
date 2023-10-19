import appReducer from './AppSlice';
import dataMapReducer from './DataMapSlice';
import functionReducer from './FunctionSlice';
import modalReducer from './ModalSlice';
import panelReducer from './PanelSlice';
import schemaReducer from './SchemaSlice';
import { configureStore } from '@reduxjs/toolkit';
import undoable, { includeAction } from 'redux-undo';

const includedActions = [
  'dataMap/setInitialSchema',
  'dataMap/doDataMapOperation',
  'dataMap/makeConnection',
  'dataMap/addFunctionNode',
  'dataMap/deleteCurrentlySelectedItem',
  'dataMap/setConnectionInput',
  'dataMap/addSourceSchemaNodes',
  'dataMap/removeSourceSchemaNodes',
];

export const store = configureStore({
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
