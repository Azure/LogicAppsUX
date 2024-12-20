import appReducer from './AppSlice';
import dataMapReducer from './DataMapSlice';
import functionReducer from './FunctionSlice';
import modalReducer from './ModalSlice';
import panelReducer from './PanelSlice';
import schemaReducer from './SchemaSlice';
import errorsReducer from './ErrorsSlice';
import type {} from 'redux-thunk';
import { configureStore } from '@reduxjs/toolkit';
import undoable, { includeAction } from 'redux-undo';

const includedActions = [
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
    errors: errorsReducer,
    dataMap: undoable(dataMapReducer, {
      filter: includeAction(includedActions),
    }),
    app: appReducer,
  },
  //middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }), // useful for debugging larger schemas, will break gated build
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
