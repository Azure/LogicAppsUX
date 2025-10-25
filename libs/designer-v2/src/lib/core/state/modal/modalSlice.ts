import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ModalState {
  isCombineVariableOpen: boolean;
  resolveCombineVariable?: (useCombined: boolean) => void;
  isTriggerDescriptionOpen: boolean;
  kindChangeDialogType?: string;
}

const initialState: ModalState = {
  isCombineVariableOpen: false,
  isTriggerDescriptionOpen: false,
  kindChangeDialogType: undefined,
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
    openKindChangeDialog: (state, action: PayloadAction<{ type: string }>) => {
      state.kindChangeDialogType = action.payload.type;
    },
    closeKindChangeDialog: (state) => {
      state.kindChangeDialogType = undefined;
    },
  },
});

export const {
  openCombineVariableModal,
  closeCombineVariableModal,
  openTriggerDescriptionModal,
  closeTriggerDescriptionModal,
  openKindChangeDialog,
  closeKindChangeDialog,
} = modalSlice.actions;
export default modalSlice.reducer;
