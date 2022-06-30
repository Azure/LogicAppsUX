import { createSlice } from '@reduxjs/toolkit';

export enum WarningModalState {
  DiscardWarning = 'discard',
  ChangeInputWarning = 'change-input-schema',
  ChangeOutputWarning = 'change-out-schema',
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
    openChangeInputWarning: (state) => {
      state.isOkClicked = false;
      state.isWarningModalOpen = true;
      state.warningModalType = WarningModalState.ChangeInputWarning;
    },
    openChangeOutputWarning: (state) => {
      state.isOkClicked = false;
      state.isWarningModalOpen = true;

      state.warningModalType = WarningModalState.ChangeOutputWarning;
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
export const { openDiscardWarning, openChangeInputWarning, openChangeOutputWarning, closeAllWarning, setOkClicked, removeOkClicked } =
  modalSlice.actions;

export default modalSlice.reducer;
