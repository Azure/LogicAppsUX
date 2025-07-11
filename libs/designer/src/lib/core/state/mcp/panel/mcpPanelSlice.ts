import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../../global';
import constants from '../../../../common/constants';
import { initializeConnectionMappings } from '../../../actions/bjsworkflow/mcp';

export const McpPanelView = {
  SelectConnector: 'selectConnector',
  SelectOperation: 'selectOperation',
  CreateConnection: 'createConnection',
  EditOperation: 'editOperation',
} as const;
export type ConfigPanelView = (typeof McpPanelView)[keyof typeof McpPanelView];

export interface PanelState {
  isOpen: boolean;
  currentPanelView?: ConfigPanelView;
  selectedTabId?: string;
  selectedOperationId?: string;
}

const initialState: PanelState = {
  isOpen: false,
  selectedOperationId: undefined,
};

export const mcpPanelSlice = createSlice({
  name: 'mcpPanel',
  initialState,
  reducers: {
    openConnectorPanelView: (
      state,
      action: PayloadAction<{
        panelView: ConfigPanelView;
      }>
    ) => {
      state.currentPanelView = action.payload.panelView;
      state.isOpen = true;
    },

    openOperationPanelView: (
      state,
      action: PayloadAction<{
        selectedOperationId: string | undefined;
      }>
    ) => {
      state.selectedOperationId = action.payload.selectedOperationId;
      state.currentPanelView = McpPanelView.EditOperation;
      state.isOpen = true;
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTabId = action.payload;
    },
    closePanel: (state: typeof initialState) => {
      state.isOpen = false;
      state.currentPanelView = undefined;
      state.selectedTabId = undefined;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
    builder.addCase(initializeConnectionMappings.fulfilled, (state) => {
      state.selectedTabId = constants.MCP_PANEL_TAB_NAMES.CONNECTIONS;
    });
  },
});

export const { openConnectorPanelView, openOperationPanelView, selectPanelTab, closePanel } = mcpPanelSlice.actions;

export default mcpPanelSlice.reducer;
