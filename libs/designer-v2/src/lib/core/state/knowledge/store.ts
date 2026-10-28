import { combineReducers, configureStore } from '@reduxjs/toolkit';
import optionsReducer from './optionsSlice';
import panelReducer from './panelSlice';
import connectionReducer from '../connection/connectionSlice';
import resourceReducer from '../mcp/resourceSlice';

const rootReducer = combineReducers({
  resource: resourceReducer,
  connection: connectionReducer,
  options: optionsReducer,
  knowledgeHubPanel: panelReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
};

export const knowledgeStore = setupStore();
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
