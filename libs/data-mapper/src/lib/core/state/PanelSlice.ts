import { SchemaTypes } from '../../models';
import { createSlice } from '@reduxjs/toolkit';

export enum ConfigPanelView {
  DefaultConfig = 'defaultConfig',
  AddSchema = 'addSchema',
  UpdateSchema = 'updateSchema',
}

export interface PanelState {
  currentPanelView?: ConfigPanelView;
  schemaType?: SchemaTypes;
}

const initialState: PanelState = {};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    // Also used onClickBackBtn
    openDefaultConfigPanelView: (state) => {
      state.schemaType = undefined;
      state.currentPanelView = ConfigPanelView.DefaultConfig;
    },

    openAddSourceSchemaPanelView: (state) => {
      state.schemaType = SchemaTypes.Source;
      state.currentPanelView = ConfigPanelView.AddSchema;
    },

    openUpdateSourceSchemaPanelView: (state) => {
      state.schemaType = SchemaTypes.Source;
      state.currentPanelView = ConfigPanelView.UpdateSchema;
    },

    openAddTargetSchemaPanelView: (state) => {
      state.schemaType = SchemaTypes.Target;
      state.currentPanelView = ConfigPanelView.AddSchema;
    },

    openUpdateTargetSchemaPanelView: (state) => {
      state.schemaType = SchemaTypes.Target;
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
} = panelSlice.actions;

export default panelSlice.reducer;
