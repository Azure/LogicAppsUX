import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../../global';
import constants from '../../../../common/constants';
import { initializeConnectionMappings, initializeOperationsMetadata } from '../../../actions/bjsworkflow/mcp';

export const McpPanelView = {
  SelectConnector: 'selectConnector',
  SelectOperation: 'selectOperation',
  UpdateOperation: 'updateOperation',
  CreateConnection: 'createConnection',
  EditOperation: 'editOperation',
  CreateLogicApp: 'createLogicApp',
} as const;
export type ConfigPanelView = (typeof McpPanelView)[keyof typeof McpPanelView];

export interface PanelState {
  isOpen: boolean;
  currentPanelView?: ConfigPanelView;
  selectedTabId?: string;
  autoOpenPanel?: boolean;
}

const initialState: PanelState = {
  isOpen: false,
};

const closePanelReducer = (state: typeof initialState) => {
  state.isOpen = false;
  state.currentPanelView = undefined;
  state.selectedTabId = undefined;
};

export const mcpPanelSlice = createSlice({
  name: 'mcpPanel',
  initialState,
  reducers: {
    openMcpPanelView: (
      state,
      action: PayloadAction<{
        panelView: ConfigPanelView;
        selectedTabId?: string;
      }>
    ) => {
      state.currentPanelView = action.payload.panelView;
      state.selectedTabId = action.payload.selectedTabId;
      state.isOpen = true;
    },
    openOperationPanelView: (state) => {
      state.currentPanelView = McpPanelView.EditOperation;
      state.isOpen = true;
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTabId = action.payload;
    },
    setAutoOpenPanel: (state, action: PayloadAction<boolean>) => {
      state.autoOpenPanel = action.payload;
    },
    closePanel: closePanelReducer,
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
    builder.addCase(initializeConnectionMappings.fulfilled, (state) => {
      state.selectedTabId = constants.MCP_PANEL_TAB_NAMES.CONNECTIONS;
    });
    builder.addCase(initializeOperationsMetadata.fulfilled, closePanelReducer);
  },
});

export const { setAutoOpenPanel, openMcpPanelView, openOperationPanelView, selectPanelTab, closePanel } = mcpPanelSlice.actions;

export default mcpPanelSlice.reducer;
