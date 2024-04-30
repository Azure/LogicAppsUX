import { templateDataLoaderSlice } from './TemplateDataLoader';
import { workflowLoaderSlice } from './WorkflowLoader';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    templateDataLoader: templateDataLoaderSlice.reducer,
    workflowLoader: workflowLoaderSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
