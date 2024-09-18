import connectionsReducer from './state/connection/connectionSlice';
import customCodeReducer from './state/customcode/customcodeSlice';
import designerOptionsReducer from './state/designerOptions/designerOptionsSlice';
import designerViewReducer from './state/designerView/designerViewSlice';
import devReducer from './state/dev/devSlice';
import operationMetadataReducer from './state/operation/operationMetadataSlice';
import panelReducer from './state/panel/panelSlice';
import settingsReducer from './state/setting/settingSlice';
import staticResultsSchemasReducer from './state/staticresultschema/staticresultsSlice';
import tokens from './state/tokens/tokensSlice';
import undoRedoReducer from './state/undoRedo/undoRedoSlice';
import workflowReducer from './state/workflow/workflowSlice';
import workflowParametersReducer from './state/workflowparameters/workflowparametersSlice';

import { configureStore } from '@reduxjs/toolkit';
import type {} from 'redux-thunk';
import { storeStateHistoryMiddleware } from './utils/middleware';

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
    customCode: customCodeReducer,
    undoRedo: undoRedoReducer,
    // if is in dev environment, add devSlice to store
    ...(process.env.NODE_ENV === 'development' ? { dev: devReducer } : {}),
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(storeStateHistoryMiddleware),
});

if (process.env.NODE_ENV === 'development') {
  (window as any).DesignerStore = store;
}

// Infer the `AppStore` from the store itself
export type AppStore = typeof store;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
