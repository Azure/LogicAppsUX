import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetTemplatesState } from '../global';

export const TemplatePanelView = {
  // Template creation panels
  QuickView: 'quickView',
  CreateWorkflow: 'createWorkflow',
  // Configure template panels
  ConfigureWorkflows: 'configureWorkflows',
  CustomizeParameter: 'customizeParameter',
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
    openConfigureWorkflowPanelView: (state) => {
      state.selectedTabId = undefined;
      state.isOpen = true;
      state.currentPanelView = TemplatePanelView.ConfigureWorkflows;
    },
    openCustomizeParameterPanelView: (state, action: PayloadAction<string>) => {
      state.selectedTabId = action.payload; // parameterName
      state.isOpen = true;
      state.currentPanelView = TemplatePanelView.ConfigureWorkflows;
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
  extraReducers: (builder) => {
    builder.addCase(resetTemplatesState, () => initialState);
  },
});

export const {
  openQuickViewPanelView,
  openCreateWorkflowPanelView,
  openConfigureWorkflowPanelView,
  openCustomizeParameterPanelView,
  selectPanelTab,
  closePanel,
} = panelSlice.actions;
export default panelSlice.reducer;
