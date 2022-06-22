import panelReducer from './PanelSlice';
import schemaReducer from './SchemaSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    schema: schemaReducer,
    panel: panelReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
