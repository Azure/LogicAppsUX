import { resetWorkflowState } from '../global';
import type { DesignerViewState } from './designerViewInterfaces';
import { createSlice } from '@reduxjs/toolkit';

const initialState: DesignerViewState = {
  showMinimap: false,
  clampPan: true,
  showDeleteModal: false,
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
    setShowDeleteModal: (state: DesignerViewState, action) => {
      state.showDeleteModal = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { toggleMinimap, toggleClampPan, setShowDeleteModal } = designerViewSlice.actions;

export default designerViewSlice.reducer;
