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

export const includedActionsForUndo = [
  'dataMap/setConnectionInput',
  'dataMap/addFunctionNode',
  'dataMap/makeConnectionFromMap',
  'dataMap/deleteConnectionFromFunctionMenu',
  'dataMap/deleteFunction',
  'dataMap/deleteEdge',
  'dataMap/updateFunctionConnectionInputs',
  'dataMap/setInitialDataMap',
];

export const store = configureStore({
  reducer: {
    schema: schemaReducer,
    function: functionReducer,
    panel: panelReducer,
    modal: modalReducer,
    errors: errorsReducer,
    dataMap: undoable(dataMapReducer, {
      filter: includeAction(includedActionsForUndo),
    }),
    app: appReducer,
  },
  //middleware: (getDefaultMiddleware) => getDefaultMiddleware({ serializableCheck: false }), // useful for debugging larger schemas, will break gated build
});

// Infer the `AppStore` from the store itself
export type AppStore = typeof store;

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
