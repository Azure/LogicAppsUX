import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface NotificationData {
  intent?: 'error';
  msg: string;
  msgBody?: string;
}

export interface NotificationState {
  data?: NotificationData;
}

const initialState: NotificationState = {};

export const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    showNotification: (state, action: PayloadAction<NotificationData>) => {
      state.data = action.payload;
    },
    hideNotification: (state) => {
      state.data = undefined;
    },
  },
});

export const { showNotification, hideNotification } = notificationSlice.actions;

export default notificationSlice.reducer;
