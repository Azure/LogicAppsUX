import { combineReducers, configureStore } from '@reduxjs/toolkit';
import resourceReducer from './resourceslice';

const rootReducer = combineReducers({
  resource: resourceReducer,
});

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState,
  });
};

export const exportConsumptionStore = setupStore();
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
