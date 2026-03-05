import { workflowLoaderSlice } from './WorkflowLoader';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    workflowLoader: workflowLoaderSlice.reducer, // Aligning with Designer WorkflowLoader to utilize AppSelectors
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
