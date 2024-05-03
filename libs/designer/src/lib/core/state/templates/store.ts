import { combineReducers, configureStore } from '@reduxjs/toolkit';
import type {} from 'redux-thunk';
import { templateSlice } from './templateSlice';
import { manifestSlice } from './manifestSlice';
import { panelSlice } from './panelSlice';

const rootReducer = combineReducers({
  template: templateSlice.reducer,
  manifest: manifestSlice.reducer,
  panel: panelSlice.reducer,
})

export const setupStore = (preloadedState?: Partial<RootState>) => {
  return configureStore({
    reducer: rootReducer,
    preloadedState
  })
}

export const templateStore = setupStore();
export const templatesPathFromState = '../../templates/samples';
export type RootState = ReturnType<typeof rootReducer>;
export type AppStore = ReturnType<typeof setupStore>;
export type AppDispatch = AppStore['dispatch'];
