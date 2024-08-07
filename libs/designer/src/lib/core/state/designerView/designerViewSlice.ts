import { resetWorkflowState } from '../global';
import type { NodeContextMenuObject, EdgeContextMenuObject, DesignerViewState } from './designerViewInterfaces';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

const initialState: DesignerViewState = {
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
    toggleMinimap: (state: DesignerViewState) => {
      state.showMinimap = !state.showMinimap;
    },
    toggleClampPan: (state: DesignerViewState) => {
      state.clampPan = !state.clampPan;
    },
    setShowDeleteModalNodeId: (state: DesignerViewState, action: PayloadAction<string | undefined>) => {
      state.showDeleteModalNodeId = action.payload;
    },
    setNodeContextMenuData: (state: DesignerViewState, action: PayloadAction<NodeContextMenuObject>) => {
      state.nodeContextMenuData = action.payload;
    },
    setEdgeContextMenuData: (state: DesignerViewState, action: PayloadAction<EdgeContextMenuObject>) => {
      state.edgeContextMenuData = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { toggleMinimap, toggleClampPan, setShowDeleteModalNodeId, setNodeContextMenuData, setEdgeContextMenuData } =
  designerViewSlice.actions;

export default designerViewSlice.reducer;
