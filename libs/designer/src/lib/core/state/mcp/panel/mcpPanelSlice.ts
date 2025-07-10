import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../../global';

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
  selectedConnectorId: string | undefined;
  selectedOperations?: string[];
}

const initialState: PanelState = {
  isOpen: false,
  selectedConnectorId: undefined,
  selectedOperations: undefined,
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
      state.selectedOperations = [];
    },
    selectConnectorId: (state, action: PayloadAction<string | undefined>) => {
      if (state.selectedConnectorId !== action.payload) {
        state.selectedOperations = [];
      }
      state.selectedConnectorId = action.payload;
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTabId = action.payload;
    },
    setSelectedOperations: (state, action: PayloadAction<string[]>) => {
      state.selectedOperations = action.payload;
    },
    clearSelectedOperations: (state) => {
      state.selectedOperations = [];
    },
    closePanel: (state: typeof initialState) => {
      state.isOpen = false;
      state.currentPanelView = undefined;
      state.selectedConnectorId = undefined;
      state.selectedTabId = undefined;
      state.selectedOperations = [];
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
  },
});

export const { openPanelView, selectConnectorId, selectPanelTab, setSelectedOperations, clearSelectedOperations, closePanel } =
  mcpPanelSlice.actions;

export default mcpPanelSlice.reducer;
