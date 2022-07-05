import type { DesignerViewState } from './designerViewInterfaces';
import { createSlice } from '@reduxjs/toolkit';

const initialState: DesignerViewState = {
  showMinimap: true,
};

export const designerViewSlice = createSlice({
  name: 'designerOptions',
  initialState,
  reducers: {
    toggleMinimap: (state: DesignerViewState) => {
      state.showMinimap = !state.showMinimap;
    },
  },
});

export const { toggleMinimap } = designerViewSlice.actions;

export default designerViewSlice.reducer;
