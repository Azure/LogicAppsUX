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
      state.selectedNode = action.payload;
      state.collapsed = false;
    },
  },
});

// Action creators are generated for each case reducer function
export const { openPanel } = panelSlice.actions;

export default panelSlice.reducer;
