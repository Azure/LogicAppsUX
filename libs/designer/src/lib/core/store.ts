import clipboardReducer from './state/clipboard/clipboardSlice';
import connectionsReducer from './state/connection/connectionSlice';
import designerOptionsReducer from './state/designerOptions/designerOptionsSlice';
import designerViewReducer from './state/designerView/designerViewSlice';
import operationMetadataReducer from './state/operation/operationMetadataSlice';
import panelReducer from './state/panel/panelSlice';
import settingsReducer from './state/setting/settingSlice';
import staticResultsSchemasReducer from './state/staticresultschema/staticresultsSlice';
import tokens from './state/tokens/tokensSlice';
import workflowReducer from './state/workflow/workflowSlice';
import workflowParametersReducer from './state/workflowparameters/workflowparametersSlice';
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
    tokens: tokens,
    workflowParameters: workflowParametersReducer,
    staticResults: staticResultsSchemasReducer,
    clipboard: clipboardReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

if (process.env.NODE_ENV === 'development') {
  (window as any).DesignerStore = store;
}

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
