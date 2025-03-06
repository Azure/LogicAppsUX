import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export const CreateTemplatePanelView = {
  AddWorkflows: 'addWorkflows',
} as const;
export type ConfigPanelView = (typeof CreateTemplatePanelView)[keyof typeof CreateTemplatePanelView];

export interface PanelState {
  isOpen: boolean;
  currentPanelView?: ConfigPanelView;
  selectedTabId: string | undefined;
}

const initialState: PanelState = {
  isOpen: false,
  selectedTabId: undefined,
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    openAddWorkflowsPanelView: (state) => {
      state.selectedTabId = undefined;
      state.isOpen = true;
      state.currentPanelView = CreateTemplatePanelView.AddWorkflows;
    },
    selectPanelTab: (state, action: PayloadAction<string | undefined>) => {
      state.selectedTabId = action.payload;
    },
    closePanel: (state) => {
      state.isOpen = false;
      state.currentPanelView = undefined;
      state.selectedTabId = undefined;
    },
  },
});

export const { openAddWorkflowsPanelView, selectPanelTab, closePanel } = panelSlice.actions;
export default panelSlice.reducer;
