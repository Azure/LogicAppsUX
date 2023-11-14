// eslint-disable-next-line import/no-named-as-default
import { dataMapDataLoaderSlice } from './DataMapDataLoader';
import { designerSlice } from './DesignerSlice';
import { vscodeSlice } from './vscodeSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    vscode: vscodeSlice.reducer,
    designer: designerSlice.reducer,
    dataMapDataLoader: dataMapDataLoaderSlice.reducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
