import connectionsReducer from './state/connection/connectionSlice';
import designerOptionsReducer from './state/designerOptions/designerOptionsSlice';
import designerViewReducer from './state/designerView/designerViewSlice';
import operationMetadataReducer from './state/operation/operationMetadataSlice';
import panelReducer from './state/panel/panelSlice';
import settingsReducer from './state/settingSlice';
import workflowReducer from './state/workflow/workflowSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    workflow: workflowReducer,
    operations: operationMetadataReducer,
    panel: panelReducer,
    connections: connectionsReducer,
    settings: settingsReducer,
    designerOptions: designerOptionsReducer,
    designerView: designerViewReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
