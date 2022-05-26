import { createSlice } from '@reduxjs/toolkit';

export interface PanelState {
  collapsed: boolean;
}

const initialState: PanelState = {
  collapsed: true,
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
  },
});

// Action creators are generated for each case reducer function
export const { expandPanel, collapsePanel } = panelSlice.actions;

export default panelSlice.reducer;
