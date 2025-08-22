import { combineReducers, configureStore } from '@reduxjs/toolkit';
import resourceReducer from './resourceslice';
import cloneReducer from './cloneslice';
import cloneOptionsReducer from './cloneoptionsslice';

const rootReducer = combineReducers({
  resource: resourceReducer,
  clone: cloneReducer,
  cloneOptions: cloneOptionsReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
};

export const cloneStandardStore = setupStore();
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
