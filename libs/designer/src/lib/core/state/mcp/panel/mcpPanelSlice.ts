import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../../global';

export const McpPanelView = {
  SelectConnector: 'selectConnector',
  CreateConnection: 'createConnection',
  SelectOperation: 'selectOperation',
  EditOperation: 'editOperation',
} as const;
export type ConfigPanelView = (typeof McpPanelView)[keyof typeof McpPanelView];

export interface PanelState {
  isOpen: boolean;
  currentPanelView?: ConfigPanelView;
  selectedConnectorId: string | undefined;
}

const initialState: PanelState = {
  isOpen: false,
  selectedConnectorId: undefined,
};

export const mcpPanelSlice = createSlice({
  name: 'mcpPanel',
  initialState,
  reducers: {
    openPanelView: (
      state,
      action: PayloadAction<{
        panelView: ConfigPanelView;
        selectedConnectorId: string | undefined;
      }>
    ) => {
      state.selectedConnectorId = action.payload.selectedConnectorId;
      state.currentPanelView = action.payload.panelView;
      state.isOpen = true;
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedConnectorId = action.payload;
    },
    closePanel: (state: typeof initialState) => {
      state.isOpen = false;
      state.currentPanelView = undefined;
      state.selectedConnectorId = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
  },
});

export const { openPanelView, selectPanelTab, closePanel } = mcpPanelSlice.actions;

export default mcpPanelSlice.reducer;
