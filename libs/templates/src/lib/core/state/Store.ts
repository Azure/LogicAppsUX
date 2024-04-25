import { configureStore } from '@reduxjs/toolkit';
import type {} from 'redux-thunk';
import templateReducer from './TemplateSlice';

export const store = configureStore({
  reducer: {
    template: templateReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
