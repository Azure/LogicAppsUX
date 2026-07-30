import workflowSlice from './workflowLoadingSlice';
import { applyStandaloneUrlSettings, parseStandaloneUrlParams } from './urlParams';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    workflowLoader: workflowSlice,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;

/**
 * URL parameters are applied synchronously here - before the first render - so options that
 * are only read at mount time (locale, dark mode, query cache persistence) take effect on the
 * initial designer load instead of causing a remount.
 */
export const standaloneUrlParams = parseStandaloneUrlParams(typeof window === 'undefined' ? '' : window.location.search);
export const shouldLoadWorkflowFromUrl =
  typeof window === 'undefined' ? false : applyStandaloneUrlSettings(store.dispatch, standaloneUrlParams);
