import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ModalState {
  isCombineVariableOpen: boolean;
  resolveCombineVariable?: (useCombined: boolean) => void;
  isTriggerDescriptionOpen: boolean;
}

const initialState: ModalState = {
  isCombineVariableOpen: false,
  isTriggerDescriptionOpen: false,
};

const modalSlice = createSlice({
  name: 'modal',
  initialState,
  reducers: {
    openCombineVariableModal: (state, action: PayloadAction<{ resolve: (useCombined: boolean) => void }>) => {
      state.isCombineVariableOpen = true;
      state.resolveCombineVariable = action.payload.resolve;
    },
    closeCombineVariableModal: (state, action: PayloadAction<boolean>) => {
      state.isCombineVariableOpen = false;
      if (state.resolveCombineVariable) {
        state.resolveCombineVariable(action.payload);
      }
      state.resolveCombineVariable = undefined;
    },
    openTriggerDescriptionModal: (state) => {
      state.isTriggerDescriptionOpen = true;
    },
    closeTriggerDescriptionModal: (state) => {
      state.isTriggerDescriptionOpen = false;
    },
  },
});

export const { openCombineVariableModal, closeCombineVariableModal, openTriggerDescriptionModal, closeTriggerDescriptionModal } =
  modalSlice.actions;
export default modalSlice.reducer;
