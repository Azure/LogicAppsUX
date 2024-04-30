import { configureStore } from '@reduxjs/toolkit';
import type {} from 'redux-thunk';
import templateReducer from './templateSlice';

export const templateStore = configureStore({
  reducer: {
    template: templateReducer,
  },
});

export type RootState = ReturnType<typeof templateStore.getState>;
export type AppDispatch = typeof templateStore.dispatch;
