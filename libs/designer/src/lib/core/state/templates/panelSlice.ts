import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetTemplatesState } from '../global';
import { initializeWorkflowsData } from '../../actions/bjsworkflow/configuretemplate';

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
    openPanelView: (
      state,
      action: PayloadAction<{
        panelView: ConfigPanelView;
        selectedTabId?: string;
      }>
    ) => {
      state.selectedTabId = action.payload.selectedTabId;
      state.isOpen = true;
      state.currentPanelView = action.payload.panelView;
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

    builder.addCase(initializeWorkflowsData.fulfilled, (state) => {
      state.isOpen = false;
    });
  },
});

export const { openPanelView, selectPanelTab, closePanel } = panelSlice.actions;
export default panelSlice.reducer;
