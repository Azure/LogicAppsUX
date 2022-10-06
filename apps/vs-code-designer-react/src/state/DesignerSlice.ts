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
    updateWorkflow: (state, action: PayloadAction<any>) => {
      state.workflow = action.payload;
    },
  },
});

export const { updateWorkflow } = designerSlice.actions;
