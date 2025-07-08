import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export type McpPanelMode = 'ConnectorSelection' | null;

export interface McpPanelState {
  isOpen: boolean;
  panelMode: McpPanelMode;
  selectedNodeIds?: string[];
}

const initialState: McpPanelState = {
  isOpen: false,
  panelMode: null,
  selectedNodeIds: [],
};

export const mcpPanelSlice = createSlice({
  name: 'mcpPanel',
  initialState,
  reducers: {
    openMcpPanel: (
      state,
      action: PayloadAction<{
        panelMode: McpPanelMode;
        selectedNodeIds?: string[];
      }>
    ) => {
      const { panelMode, selectedNodeIds } = action.payload;
      state.isOpen = true;
      state.panelMode = panelMode;
      state.selectedNodeIds = selectedNodeIds ?? [];
    },

    clearMcpPanel: (state) => {
      state.isOpen = false;
      state.panelMode = null;
      state.selectedNodeIds = [];
    },

    toggleMcpPanel: (state) => {
      state.isOpen = !state.isOpen;
    },
  },
});

export const { openMcpPanel, clearMcpPanel, toggleMcpPanel } = mcpPanelSlice.actions;

export default mcpPanelSlice.reducer;
