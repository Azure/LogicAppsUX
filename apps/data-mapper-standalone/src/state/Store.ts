import { dataMapApi } from './DataMapApi';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: {
    dataMapApi: dataMapApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(dataMapApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
