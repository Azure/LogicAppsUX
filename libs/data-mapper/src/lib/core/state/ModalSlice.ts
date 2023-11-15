import { createSlice } from '@reduxjs/toolkit';

// NOTE: Currently, modal is just used for discard data map changes warning
export const WarningModalState = {
  DiscardWarning: 'discard',
} as const;
export type WarningModalState = (typeof WarningModalState)[keyof typeof WarningModalState];
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
    openDiscardWarningModal: (state) => {
      state.isWarningModalOpen = true;
      state.warningModalType = WarningModalState.DiscardWarning;
    },
    closeModal: (state) => {
      state.isWarningModalOpen = false;
      state.isOkClicked = false;
      state.warningModalType = undefined;
    },
    setModalOkClicked: (state) => {
      state.isOkClicked = true;
    },
  },
});

export const { openDiscardWarningModal, closeModal, setModalOkClicked } = modalSlice.actions;

export default modalSlice.reducer;
