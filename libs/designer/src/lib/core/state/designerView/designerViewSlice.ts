import { resetWorkflowState } from '../global';
import type { NodeContextMenuObject, EdgeContextMenuObject, DesignerViewState } from './designerViewInterfaces';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export const initialState: DesignerViewState = {
  showMinimap: false,
  clampPan: true,
  showDeleteModalNodeId: undefined,
  nodeContextMenuData: undefined,
  edgeContextMenuData: undefined,
};

export const designerViewSlice = createSlice({
  name: 'designerView',
  initialState,
  reducers: {
    toggleMinimap: (state) => {
      state.showMinimap = !state.showMinimap;
    },
    toggleClampPan: (state) => {
      state.clampPan = !state.clampPan;
    },
    setShowDeleteModalNodeId: (state, action: PayloadAction<string | undefined>) => {
      state.showDeleteModalNodeId = action.payload;
    },
    setNodeContextMenuData: (state, action: PayloadAction<NodeContextMenuObject>) => {
      state.nodeContextMenuData = action.payload;
    },
    setEdgeContextMenuData: (state, action: PayloadAction<EdgeContextMenuObject>) => {
      state.edgeContextMenuData = action.payload;
    },
    resetDesignerView: () => initialState,
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const {
  toggleMinimap,
  toggleClampPan,
  setShowDeleteModalNodeId,
  setNodeContextMenuData,
  setEdgeContextMenuData,
  resetDesignerView,
} = designerViewSlice.actions;

export default designerViewSlice.reducer;
