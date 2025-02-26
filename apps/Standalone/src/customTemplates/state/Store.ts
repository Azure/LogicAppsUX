import { customTemplateLoaderSlice } from './CustomTemplateLoader';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    customTemplateLoader: customTemplateLoaderSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
