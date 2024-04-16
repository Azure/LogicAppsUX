import { dataMapSlice } from './DataMapSlice';
import { designerSlice } from './DesignerSlice';
import { workflowSlice } from './WorkflowSlice';
import { projectSlice } from './projectSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    project: projectSlice.reducer,
    workflow: workflowSlice.reducer,
    designer: designerSlice.reducer,
    dataMapDataLoader: dataMapSlice.reducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
