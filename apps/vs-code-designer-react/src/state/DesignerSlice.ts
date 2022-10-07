import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface designerState {
  workflow?: Record<string, any> | null;
}

const initialState: designerState = {
  workflow: null,
};

export const designerSlice = createSlice({
  name: 'designer',
  initialState,
  reducers: {
    updateMetaData: (state, action: PayloadAction<any>) => {
      const { codelessApp } = action.payload.panelMetadata;
      state.workflow = codelessApp;
    },
  },
});

export const { updateMetaData } = designerSlice.actions;
