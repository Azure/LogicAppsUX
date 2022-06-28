import connectionsReducer from './state/connectionSlice';
import designerOptionsReducer from './state/designerOptions/designerOptionsSlice';
import operationMetadataReducer from './state/operationMetadataSlice';
import panelReducer from './state/panel/panelSlice';
import workflowReducer from './state/workflowSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    workflow: workflowReducer,
    operations: operationMetadataReducer,
    panel: panelReducer,
    connections: connectionsReducer,
    designerOptions: designerOptionsReducer,
  },
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
