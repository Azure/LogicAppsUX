import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export const KnowledgePanelView = {
  CreateConnection: 'createConnection',
  EditConnection: 'editConnection',
  AddFiles: 'addFiles',
} as const;
export type ConfigPanelView = (typeof KnowledgePanelView)[keyof typeof KnowledgePanelView];

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

export const panelSlice = createSlice({
  name: 'knowledgeHubPanel',
  initialState,
  reducers: {
    openPanelView: (
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
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTabId = action.payload;
    },
    closePanel: closePanelReducer,
  },
});

export const { openPanelView, selectPanelTab, closePanel } = panelSlice.actions;

export default panelSlice.reducer;
