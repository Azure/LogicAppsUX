import { SchemaTypes } from '../../components/schemaSelection/addSchemaPanelButton';
import { createSlice } from '@reduxjs/toolkit';

export interface PanelState {
  collapsed: boolean;

  isDefaultConfigPanelOpen: boolean; // if the default one is open
  isChangeSchemaPanelOpen: boolean; // if the input/output schema change panel is open - either on top or by itself
  schemaType?: SchemaTypes;
}

const initialState: PanelState = {
  collapsed: true,
  isDefaultConfigPanelOpen: false,
  isChangeSchemaPanelOpen: false,
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    expandPanel: (state) => {
      state.collapsed = false;
    },
    collapsePanel: (state) => {
      state.collapsed = true;
    },

    // below are for schema panels
    openDefaultConfigPanel: (state) => {
      state.isChangeSchemaPanelOpen = false;
      state.schemaType = undefined;
      state.isDefaultConfigPanelOpen = true;
    },

    closeDefaultConfigPanel: (state) => {
      state.isDefaultConfigPanelOpen = false;
      state.isChangeSchemaPanelOpen = false;
      state.schemaType = undefined;
    },

    openInputSchemaPanel: (state) => {
      state.schemaType = SchemaTypes.Input;
      state.isChangeSchemaPanelOpen = true;
    },

    openOutputSchemaPanel: (state) => {
      state.schemaType = SchemaTypes.Output;
      state.isChangeSchemaPanelOpen = true;
    },

    closeSchemaPanel: (state) => {
      state.isChangeSchemaPanelOpen = false;
      state.schemaType = undefined;
    },
  },
});

// Action creators are generated for each case reducer function
export const {
  expandPanel,
  collapsePanel,
  openDefaultConfigPanel,
  closeDefaultConfigPanel,
  openInputSchemaPanel,
  openOutputSchemaPanel,
  closeSchemaPanel,
} = panelSlice.actions;

export default panelSlice.reducer;
