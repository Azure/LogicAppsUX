//import breadcrumbReducer from './BreadcrumbSlice';
import panelReducer from './PanelSlice';
import reactFlowReducer from './ReactFlowSlice';
import schemaReducer from './SchemaSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    schema: schemaReducer,
    //breadcrumb: breadcrumbReducer,
    reactFlow: reactFlowReducer,
    panel: panelReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
