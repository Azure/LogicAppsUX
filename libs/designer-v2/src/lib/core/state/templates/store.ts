import { combineReducers, configureStore } from '@reduxjs/toolkit';
import type {} from 'redux-thunk';
import workflowReducer from './workflowSlice';
import templateReducer from './templateSlice';
import manifestReducer from './manifestSlice';
import panelReducer from './panelSlice';
import tabReducer from './tabSlice';
import operationReducer from '../operation/operationMetadataSlice';
import templateOptionsReducer from './templateOptionsSlice';

const rootReducer = combineReducers({
  workflow: workflowReducer,
  template: templateReducer,
  manifest: manifestReducer,
  panel: panelReducer,
  tab: tabReducer,
  operation: operationReducer,
  templateOptions: templateOptionsReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
};

export const templateStore = setupStore();
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
