import { SchemaTypes } from '../../components/configPanel/EditorConfigPanel';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ModalState {
  isWarningModalOpen: boolean;
  isDiscardWarning: boolean;
  isChangeSchemaWarning: boolean;
  schemaType?: SchemaTypes;
  onOkClick?: () => void;
}

const initialState: ModalState = {
  isWarningModalOpen: false,
  isDiscardWarning: false,
  isChangeSchemaWarning: false,
  // onOkClick: () => undefined,
};

export const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openDiscardWarning: (state, action: PayloadAction<() => void>) => {
      const incomingOkAction = action.payload;
      state.isDiscardWarning = true;
      state.onOkClick = incomingOkAction;
      state.isWarningModalOpen = true;
    },
    openChangeInputWarning: (state, action: PayloadAction<() => void>) => {
      const incomingOkAction = action.payload;
      state.isChangeSchemaWarning = true;
      state.schemaType = SchemaTypes.Input;
      state.onOkClick = incomingOkAction;
      state.isWarningModalOpen = true;
    },
    openChangeOutputWarning: (state, action: PayloadAction<() => void>) => {
      const incomingOkAction = action.payload;
      state.isChangeSchemaWarning = true;
      state.schemaType = SchemaTypes.Output;
      state.onOkClick = incomingOkAction;
      state.isWarningModalOpen = true;
    },
    closeAllWarning: (state) => {
      state.isWarningModalOpen = false;
      state.isDiscardWarning = false;
      state.isChangeSchemaWarning = false;
      state.schemaType = undefined;
      state.onOkClick = undefined;
    },
  },
});

// Action creators are generated for each case reducer function
export const { openDiscardWarning, openChangeInputWarning, openChangeOutputWarning, closeAllWarning } = modalSlice.actions;

export default modalSlice.reducer;
