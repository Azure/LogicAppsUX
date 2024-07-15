import { SchemaType } from '@microsoft/logic-apps-shared';
import { createSlice } from '@reduxjs/toolkit';

export const ConfigPanelView = {
  DefaultConfig: 'defaultConfig',
  AddSchema: 'addSchema',
  UpdateSchema: 'updateSchema',
} as const;
export type ConfigPanelView = (typeof ConfigPanelView)[keyof typeof ConfigPanelView];

export interface PanelState {
  currentPanelView?: ConfigPanelView;
  schemaType?: SchemaType;
  isCodeViewOpen: boolean;
  isTestPanelOpen: boolean;
}

const initialState: PanelState = {
  currentPanelView: ConfigPanelView.AddSchema,
  isCodeViewOpen: false,
  isTestPanelOpen: false,
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    // Also used onClickBackBtn
    openDefaultConfigPanelView: (state) => {
      state.schemaType = undefined;
      state.currentPanelView = ConfigPanelView.DefaultConfig;
    },

    toggleCodeView: (state) => {
      // Close test panel first if code view needs to open
      if (!state.isCodeViewOpen && state.isTestPanelOpen) {
        state.isTestPanelOpen = false;
      }
      state.isCodeViewOpen = !state.isCodeViewOpen;
    },

    toggleTestPanel: (state) => {
      // Close code view first if test panel needs to open
      if (!state.isTestPanelOpen && state.isCodeViewOpen) {
        state.isCodeViewOpen = false;
      }
      state.isTestPanelOpen = !state.isTestPanelOpen;
    },

    openAddSourceSchemaPanelView: (state) => {
      state.schemaType = SchemaType.Source;
      state.currentPanelView = ConfigPanelView.AddSchema;
    },

    openUpdateSourceSchemaPanelView: (state) => {
      state.schemaType = SchemaType.Source;
      state.currentPanelView = ConfigPanelView.UpdateSchema;
    },

    openAddTargetSchemaPanelView: (state) => {
      state.schemaType = SchemaType.Target;
      state.currentPanelView = ConfigPanelView.AddSchema;
    },

    openUpdateTargetSchemaPanelView: (state) => {
      state.schemaType = SchemaType.Target;
      state.currentPanelView = ConfigPanelView.UpdateSchema;
    },

    closePanel: (state) => {
      state.schemaType = undefined;
      state.currentPanelView = undefined;
    },
  },
});

export const {
  openDefaultConfigPanelView,
  openAddSourceSchemaPanelView,
  openUpdateSourceSchemaPanelView,
  openAddTargetSchemaPanelView,
  openUpdateTargetSchemaPanelView,
  closePanel,
  toggleCodeView,
  toggleTestPanel,
} = panelSlice.actions;

export default panelSlice.reducer;
