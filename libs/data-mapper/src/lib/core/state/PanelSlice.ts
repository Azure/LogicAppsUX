import { SchemaTypes } from '../../models';
import { createSlice } from '@reduxjs/toolkit';

export interface PanelState {
  isDefaultConfigPanelOpen: boolean;
  isChangeSchemaPanelOpen: boolean;
  schemaType?: SchemaTypes;
}

const initialState: PanelState = {
  isDefaultConfigPanelOpen: false,
  isChangeSchemaPanelOpen: false,
};

export const panelSlice = createSlice({
  name: 'panel',
  initialState,
  reducers: {
    openDefaultConfigPanel: (state) => {
      state.isChangeSchemaPanelOpen = false;
      state.schemaType = undefined;
      state.isDefaultConfigPanelOpen = true;
    },

    closeDefaultConfigPanel: (state) => {
      state.isChangeSchemaPanelOpen = false;
      state.isDefaultConfigPanelOpen = false;
    },

    openSourceSchemaPanel: (state) => {
      state.schemaType = SchemaTypes.Source;
      state.isChangeSchemaPanelOpen = true;
    },

    openTargetSchemaPanel: (state) => {
      state.schemaType = SchemaTypes.Target;
      state.isChangeSchemaPanelOpen = true;
    },

    closeSchemaChangePanel: (state) => {
      state.isChangeSchemaPanelOpen = false;
    },
  },
});

export const { openDefaultConfigPanel, closeDefaultConfigPanel, openSourceSchemaPanel, openTargetSchemaPanel, closeSchemaChangePanel } =
  panelSlice.actions;

export default panelSlice.reducer;
