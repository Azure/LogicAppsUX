import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ConnectionSlice {
  connectionId: string;
}

const initialState: ConnectionSlice = {
  connectionId: '',
};

export const connectionSlice = createSlice({
  name: 'connectionDataLoader',
  initialState,
  reducers: {
    initializeConnection: (state, action: PayloadAction<string>) => {
      state.connectionId = action.payload;
    },
  },
});

export const { initializeConnection } = connectionSlice.actions;
