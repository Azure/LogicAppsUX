import { SchemaTypes } from '../../models';
import { createSlice } from '@reduxjs/toolkit';

export interface PanelState {
  leftPanelCollapsed: boolean;

  isDefaultConfigPanelOpen: boolean;
  isChangeSchemaPanelOpen: boolean;
  schemaType?: SchemaTypes;
}

const initialState: PanelState = {
  leftPanelCollapsed: true,
  isDefaultConfigPanelOpen: false,
  isChangeSchemaPanelOpen: false,
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    expandLeftPanel: (state) => {
      state.leftPanelCollapsed = false;
    },
    collapseLeftPanel: (state) => {
      state.leftPanelCollapsed = true;
    },

    openDefaultConfigPanel: (state) => {
      state.isChangeSchemaPanelOpen = false;
      state.schemaType = undefined;
      state.isDefaultConfigPanelOpen = true;
    },

    closeDefaultConfigPanel: (state) => {
      state.isChangeSchemaPanelOpen = false;
      state.isDefaultConfigPanelOpen = false;
    },

    openInputSchemaPanel: (state) => {
      state.schemaType = SchemaTypes.Input;
      state.isChangeSchemaPanelOpen = true;
    },

    openOutputSchemaPanel: (state) => {
      state.schemaType = SchemaTypes.Output;
      state.isChangeSchemaPanelOpen = true;
    },

    closeSchemaChangePanel: (state) => {
      state.isChangeSchemaPanelOpen = false;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  expandLeftPanel,
  collapseLeftPanel,
  openDefaultConfigPanel,
  closeDefaultConfigPanel,
  openInputSchemaPanel,
  openOutputSchemaPanel,
  closeSchemaChangePanel,
} = panelSlice.actions;

export default panelSlice.reducer;
