import { combineReducers, configureStore } from '@reduxjs/toolkit';
import type {} from 'redux-thunk';
import workflowReducer from './workflowSlice';
import templateReducer from './templateSlice';
import customTemplateOptionsReducer from './customTemplateOptionsSlice';
import panelReducer from './panelSlice';

const rootReducer = combineReducers({
  workflow: workflowReducer,
  template: templateReducer,
  customTemplateOptions: customTemplateOptionsReducer,
  panel: panelReducer,
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
