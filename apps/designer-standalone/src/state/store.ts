import workflowSlice from './workflowLoadingSlice';
import { configureStore } from '@reduxjs/toolkit';

// eslint-disable-next-line @typescript-eslint/no-unused-vars

export const store = configureStore({
  reducer: {
    workflowLoader: workflowSlice,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
