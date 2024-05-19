import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export const TemplatePanelView = {
  QuickView: 'quickView',
  CreateWorkflow: 'createWorkflow',
} as const;
export type ConfigPanelView = (typeof TemplatePanelView)[keyof typeof TemplatePanelView];

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
    openQuickViewPanelView: (state) => {
      state.selectedTabId = undefined;
      state.isOpen = true;
      state.currentPanelView = TemplatePanelView.QuickView;
    },
    openCreateWorkflowPanelView: (state) => {
      state.selectedTabId = undefined;
      state.isOpen = true;
      state.currentPanelView = TemplatePanelView.CreateWorkflow;
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

export const { openQuickViewPanelView, openCreateWorkflowPanelView, selectPanelTab, closePanel } = panelSlice.actions;
