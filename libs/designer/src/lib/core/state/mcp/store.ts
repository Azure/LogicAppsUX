import { combineReducers, configureStore } from '@reduxjs/toolkit';
import workflowReducer from './workflowSlice';
import mcpReducer from './mcpSlice';
import mcpOptionsReducer from './mcpOptionsSlice';
import operationReducer from '../operation/operationMetadataSlice';

const rootReducer = combineReducers({
  workflow: workflowReducer,
  operation: operationReducer,
  mcp: mcpReducer,
  mcpOptions: mcpOptionsReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
};

export const mcpStore = setupStore();
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
