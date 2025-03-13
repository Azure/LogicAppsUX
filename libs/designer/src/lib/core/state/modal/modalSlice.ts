import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ModalState {
  isOpen: boolean;
  resolve?: (useCombined: boolean) => void;
}

const initialState: ModalState = {
  isOpen: false,
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openModal: (state, action: PayloadAction<{ resolve: (useCombined: boolean) => void }>) => {
      state.isOpen = true;
      state.resolve = action.payload.resolve;
    },
    closeModal: (state, action: PayloadAction<boolean>) => {
      state.isOpen = false;
      if (state.resolve) {
        state.resolve(action.payload);
      }
      state.resolve = undefined;
    },
  },
});

export const { openModal, closeModal } = modalSlice.actions;
export default modalSlice.reducer;
