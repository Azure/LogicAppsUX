import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface PanelState {
  collapsed: boolean;
  selectedNode: string;
}

const initialState: PanelState = {
  collapsed: true,
  selectedNode: '',
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
    },
  },
});

// Action creators are generated for each case reducer function
export const { expandPanel, collapsePanel, changePanelNode } = panelSlice.actions;

export default panelSlice.reducer;
