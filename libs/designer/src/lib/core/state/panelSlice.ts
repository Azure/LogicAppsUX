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
    openPanel: (state, action: PayloadAction<string>) => {
      if (!action) return;
      state.selectedNode = action.payload;
      state.collapsed = false;
    },
    closePanel: (state) => {
      state.collapsed = true;
    },
  },
});

// Action creators are generated for each case reducer function
export const { openPanel, closePanel } = panelSlice.actions;

export default panelSlice.reducer;
