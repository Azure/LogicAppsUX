import { combineReducers, configureStore } from '@reduxjs/toolkit';
import mcpOptionsReducer from './mcpOptions/mcpOptionsSlice';
import operationReducer from '../operation/operationMetadataSlice';
import panelReducer from './panel/mcpPanelSlice';
import connectionReducer from '../connection/connectionSlice';
import resourceReducer from './resourceSlice';
import connectorReducer from './connector/connectorSlice';

const rootReducer = combineReducers({
  resource: resourceReducer,
  operations: operationReducer,
  connection: connectionReducer,
  mcpOptions: mcpOptionsReducer,
  mcpPanel: panelReducer,
  connector: connectorReducer,
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
