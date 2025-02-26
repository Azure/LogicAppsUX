import { combineReducers, configureStore } from '@reduxjs/toolkit';
import type {} from 'redux-thunk';
import workflowReducer from './workflowSlice';

const rootReducer = combineReducers({
  workflow: workflowReducer,
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
