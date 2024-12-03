import { SchemaType } from '@microsoft/logic-apps-shared';
import type { Reducer } from '@reduxjs/toolkit';
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
}

const initialState: PanelState = {};

type Reducers = {
  openDefaultConfigPanelView: (state: PanelState) => void;
  openAddSourceSchemaPanelView: (state: PanelState) => void;
  openUpdateSourceSchemaPanelView: (state: PanelState) => void;
  openAddTargetSchemaPanelView: (state: PanelState) => void;
  openUpdateTargetSchemaPanelView: (state: PanelState) => void;
  closePanel: (state: PanelState) => void;
};

export const panelSlice = createSlice<PanelState, Reducers, 'panel', any>({
  name: 'panel',
  initialState,
  reducers: {
    // Also used onClickBackBtn
    openDefaultConfigPanelView: (state) => {
      state.schemaType = undefined;
      state.currentPanelView = ConfigPanelView.DefaultConfig;
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
} = panelSlice.actions;

const panelReducer: Reducer<PanelState> = panelSlice.reducer;
export default panelReducer;
