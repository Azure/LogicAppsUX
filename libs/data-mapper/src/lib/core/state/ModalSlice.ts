import { SchemaTypes } from '../../components/configPanel/EditorConfigPanel';
import { createSlice } from '@reduxjs/toolkit';

export interface ModalState {
  isWarningModalOpen: boolean;
  isDiscardWarning: boolean;
  isChangeSchemaWarning: boolean;
  schemaType?: SchemaTypes;
}

const initialState: ModalState = {
  isWarningModalOpen: false,
  isDiscardWarning: false,
  isChangeSchemaWarning: false,
};

export const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openDiscardWarning: (state) => {
      state.isDiscardWarning = true;
      state.isWarningModalOpen = true;
    },
    openChangeInputWarning: (state) => {
      state.isChangeSchemaWarning = true;
      state.schemaType = SchemaTypes.Input;
      state.isWarningModalOpen = true;
    },
    openChangeOutputWarning: (state) => {
      state.isChangeSchemaWarning = true;
      state.schemaType = SchemaTypes.Output;
      state.isWarningModalOpen = true;
    },
    closeAllWarning: (state) => {
      state.isWarningModalOpen = false;
      state.isDiscardWarning = false;
      state.isChangeSchemaWarning = false;
      state.schemaType = undefined;
    },
  },
});

// Action creators are generated for each case reducer function
export const { openDiscardWarning, openChangeInputWarning, openChangeOutputWarning, closeAllWarning } = modalSlice.actions;

export default modalSlice.reducer;
