import { configureTemplateLoaderSlice } from './ConfigureTemplateLoader';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    configureTemplateLoader: configureTemplateLoaderSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
