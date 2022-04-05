import panelReducer from './state/panelSlice';
import workflowReducer from './state/workflowSlice';
import { configureStore } from '@reduxjs/toolkit';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { AnyObject } from 'immer/dist/internal';

export const store = configureStore({
  reducer: {
    workflow: workflowReducer,
    panel: panelReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware(),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
