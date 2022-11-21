import { designerSlice } from './DesignerSlice';
import { configureStore } from '@reduxjs/toolkit';

export const store = configureStore({
  reducer: { designer: designerSlice.reducer },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
