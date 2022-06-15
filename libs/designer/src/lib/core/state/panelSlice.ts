import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
  isDiscovery: boolean;
  parentId?: string;
  childId?: string;
}

const initialState: PanelState = {
  collapsed: true,
  selectedNode: '',
  isDiscovery: false,
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    expandPanel: (state) => {
      state.collapsed = false;
    },
    collapsePanel: (state) => {
      state.collapsed = true;
    },
    clearPanel: (state) => {
      state.collapsed = true;
      state.selectedNode = '';
    },
    changePanelNode: (state, action: PayloadAction<string>) => {
      if (!action) return;
      state.selectedNode = action.payload;
      state.isDiscovery = false;
    },
    expandDiscoveryPanel: (state, action: PayloadAction<{ childId?: string; parentId?: string; nodeId: string }>) => {
      state.collapsed = false;
      state.isDiscovery = true;
      state.parentId = action.payload.parentId;
      state.childId = action.payload.childId;
      state.selectedNode = action.payload.nodeId;
    },
    switchToOperationPanel: (state, action: PayloadAction<string>) => {
      state.selectedNode = action.payload;
      state.isDiscovery = false;
    },
  },
});

// Action creators are generated for each case reducer function
export const { expandPanel, collapsePanel, clearPanel, changePanelNode, expandDiscoveryPanel, switchToOperationPanel } = panelSlice.actions;

export default panelSlice.reducer;
