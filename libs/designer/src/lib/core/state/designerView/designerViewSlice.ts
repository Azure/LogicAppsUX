import { resetWorkflowState } from '../global';
import type { DesignerViewState } from './designerViewInterfaces';
import { createSlice } from '@reduxjs/toolkit';

const initialState: DesignerViewState = {
  showMinimap: false,
  clampPan: true,
};

export const designerViewSlice = createSlice({
  name: 'designerView',
  initialState,
  reducers: {
    toggleMinimap: (state: DesignerViewState) => {
      state.showMinimap = !state.showMinimap;
    },
    toggleClampPan: (state: DesignerViewState) => {
      state.clampPan = !state.clampPan;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { toggleMinimap, toggleClampPan } = designerViewSlice.actions;

export default designerViewSlice.reducer;
