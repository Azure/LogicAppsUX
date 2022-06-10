import panelReducer from './PanelSlice';
import reactFlowReducer from './ReactFlowSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    reactFlow: reactFlowReducer,
    panel: panelReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
