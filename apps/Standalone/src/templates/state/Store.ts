import { dataMapDataLoaderSlice } from './DataMapDataLoader';
import { schemaDataLoaderSlice } from './SchemaDataLoader';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    dataMapDataLoader: dataMapDataLoaderSlice.reducer,
    schemaDataLoader: schemaDataLoaderSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
