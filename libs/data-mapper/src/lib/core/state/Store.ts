import { configureStore } from '@reduxjs/toolkit';
import { dataMapApi } from './DataMapApi';
import panelReducer from './panelSlice';

export const store = configureStore({
  reducer: {
    panel: panelReducer,
    dataMapApi: dataMapApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(dataMapApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
