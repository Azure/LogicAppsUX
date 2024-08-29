import { resetWorkflowState } from '../global';
import type { DesignerViewState } from './designerViewInterfaces';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export const initialState: DesignerViewState = {
  showMinimap: false,
  clampPan: true,
  showDeleteModalNodeId: undefined,
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
    setShowDeleteModalNodeId: (state: DesignerViewState, action: PayloadAction<string | undefined>) => {
      state.showDeleteModalNodeId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { toggleMinimap, toggleClampPan, setShowDeleteModalNodeId } = designerViewSlice.actions;

export default designerViewSlice.reducer;
