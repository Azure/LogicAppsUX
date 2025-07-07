import { combineReducers, configureStore } from '@reduxjs/toolkit';
import resourceReducer from './resourceSlice';
import mcpOptionsReducer from './mcpOptionsSlice';
import operationReducer from '../operation/operationMetadataSlice';
import connectionReducer from '../connection/connectionSlice';
import panelReducer from '../panel/panelSlice';

const rootReducer = combineReducers({
  resource: resourceReducer,
  operation: operationReducer,
  connection: connectionReducer,
  mcpOptions: mcpOptionsReducer,
  panel: panelReducer,
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
