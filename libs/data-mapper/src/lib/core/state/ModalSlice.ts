import { SchemaTypes } from '../../components/configPanel/EditorConfigPanel';
// import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export enum WarningModalState {
  DicardWarning = 'discard',
  ChangeSchemaWarning = 'change-schema',
}

export interface ModalState {
  isWarningModalOpen: boolean;
  isDiscardWarning: boolean;
  isChangeSchemaWarning: boolean;
  schemaType?: SchemaTypes;

  warningModalType?: WarningModalState;
  isOkClicked: boolean;
}

const initialState: ModalState = {
  isWarningModalOpen: false,
  isDiscardWarning: false,
  isChangeSchemaWarning: false,

  isOkClicked: false,
};

export const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openDiscardWarning: (state) => {
      state.isOkClicked = false;
      state.isDiscardWarning = true;
      state.isWarningModalOpen = true;
    },
    openChangeInputWarning: (state) => {
      state.isOkClicked = false;
      state.isChangeSchemaWarning = true;
      state.schemaType = SchemaTypes.Input;
      state.isWarningModalOpen = true;
    },
    openChangeOutputWarning: (state) => {
      state.isOkClicked = false;
      state.isChangeSchemaWarning = true;
      state.schemaType = SchemaTypes.Output;
      state.isWarningModalOpen = true;
    },
    closeAllWarning: (state) => {
      state.isWarningModalOpen = false;
      state.isDiscardWarning = false;
      state.isChangeSchemaWarning = false;
      state.schemaType = undefined;
      // state.onOkClick = undefined;
      // state.isOkClicked = false;
    },
    setOkClicked: (state) => {
      state.isOkClicked = true;
    },
    removeOkClicked: (state) => {
      state.isOkClicked = false;
    },
  },
});

// Action creators are generated for each case reducer function
export const { openDiscardWarning, openChangeInputWarning, openChangeOutputWarning, closeAllWarning, setOkClicked, removeOkClicked } =
  modalSlice.actions;

export default modalSlice.reducer;
