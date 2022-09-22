import { SchemaTypes } from '../../models/Schema';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export enum WarningModalState {
  DiscardWarning = 'discard',
  ChangeSourceWarning = 'change-source-schema',
  ChangeTargetWarning = 'change-out-schema',
}

export interface ModalState {
  isWarningModalOpen: boolean;
  warningModalType?: WarningModalState;
  isOkClicked: boolean;
}

const initialState: ModalState = {
  isWarningModalOpen: false,
  isOkClicked: false,
};

export const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openDiscardWarning: (state) => {
      state.isOkClicked = false;
      state.isWarningModalOpen = true;
      state.warningModalType = WarningModalState.DiscardWarning;
    },
    openChangeSchemaWarning: (state, action: PayloadAction<{ schemaType: SchemaTypes.Source | SchemaTypes.Target }>) => {
      state.isOkClicked = false;
      state.isWarningModalOpen = true;
      if (action.payload.schemaType === SchemaTypes.Source) {
        state.warningModalType = WarningModalState.ChangeSourceWarning;
      } else {
        state.warningModalType = WarningModalState.ChangeTargetWarning;
      }
    },
    openChangeTargetWarning: (state) => {
      state.isOkClicked = false;
      state.isWarningModalOpen = true;
      state.warningModalType = WarningModalState.ChangeTargetWarning;
    },
    closeAllWarning: (state) => {
      state.isWarningModalOpen = false;
      state.warningModalType = undefined;
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
export const { openDiscardWarning, openChangeSchemaWarning, closeAllWarning, setOkClicked, removeOkClicked } = modalSlice.actions;

export default modalSlice.reducer;
