import appReducer from './AppSlice';
import dataMapReducer from './DataMapSlice';
import functionReducer from './FunctionSlice';
import modalReducer from './ModalSlice';
import panelReducer from './PanelSlice';
import schemaReducer from './SchemaSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    schema: schemaReducer,
    function: functionReducer,
    panel: panelReducer,
    modal: modalReducer,
    dataMap: dataMapReducer,
    app: appReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
