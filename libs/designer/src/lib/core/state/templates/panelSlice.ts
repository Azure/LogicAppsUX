import { createSlice } from '@reduxjs/toolkit';

export const TemplatePanelView = {
  QuickView: 'quickView',
  CreateWorkflow: 'createWorkflow',
} as const;
export type ConfigPanelView = (typeof TemplatePanelView)[keyof typeof TemplatePanelView];

export interface PanelState {
  isOpen: boolean;
  currentPanelView?: ConfigPanelView;
}

const initialState: PanelState = {
  isOpen: false,
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    openQuickViewPanelView: (state) => {
      state.isOpen = true;
      state.currentPanelView = TemplatePanelView.QuickView;
    },
    openCreateWorkflowPanelView: (state) => {
      state.isOpen = true;
      state.currentPanelView = TemplatePanelView.CreateWorkflow;
    },
    closePanel: (state) => {
      state.isOpen = false;
      state.currentPanelView = undefined;
    },
  },
});

export const { openQuickViewPanelView, openCreateWorkflowPanelView, closePanel } = panelSlice.actions;
