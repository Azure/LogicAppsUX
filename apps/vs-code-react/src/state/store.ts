import { dataMapSlice as dataMapSliceV1 } from './DataMapSlice';
import { dataMapSlice as dataMapSliceV2 } from './DataMapSliceV2';
import { designerSlice } from './DesignerSlice';
import { workflowSlice } from './WorkflowSlice';
import { projectSlice } from './projectSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    project: projectSlice.reducer,
    workflow: workflowSlice.reducer,
    designer: designerSlice.reducer,
    dataMapDataLoader: dataMapSliceV1.reducer, // Data Mapper V1
    dataMap: dataMapSliceV2.reducer, // Data Mapper V2
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
