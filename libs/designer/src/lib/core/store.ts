import { operationDeserializer } from './actions/operationdeserializer';
import connectorsReducer from './state/connectorSlice';
import operationMetadataReducer from './state/operationMetadataSlice';
import servicesReducer from './state/servicesSlice';
import workflowReducer from './state/workflowSlice';
import { configureStore } from '@reduxjs/toolkit';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { AnyObject } from 'immer/dist/internal';

export const store = configureStore({
  reducer: {
    workflow: workflowReducer,
    operations: operationMetadataReducer,
    connectors: connectorsReducer,
    context: servicesReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().prepend(operationDeserializer.middleware),
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
