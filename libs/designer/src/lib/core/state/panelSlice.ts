import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
  isDiscovery: boolean;
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
    changePanelNode: (state, action: PayloadAction<string>) => {
      if (!action) return;
      state.selectedNode = action.payload;
      state.isDiscovery = false;
    },
    expandDiscoveryPanel: (state) => {
      state.collapsed = false;
      state.isDiscovery = true;
    },
  },
});

// Action creators are generated for each case reducer function
export const { expandPanel, collapsePanel, changePanelNode, expandDiscoveryPanel } = panelSlice.actions;

export default panelSlice.reducer;
