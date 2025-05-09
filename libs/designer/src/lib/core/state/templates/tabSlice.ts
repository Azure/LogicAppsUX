import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetTemplatesState } from '../global';
import { deleteWorkflowData, initializeWorkflowsData, loadCustomTemplate } from '../../actions/bjsworkflow/configuretemplate';

export interface TabState {
  selectedTabId: string | undefined;
  runValidation: boolean;
  enableWizard: boolean;
  isWizardUpdating: boolean;
}

const initialState: TabState = {
  selectedTabId: undefined,
  runValidation: false,
  enableWizard: false,
  isWizardUpdating: false,
};

export const tabSlice = createSlice({
  name: 'tab',
  initialState,
  reducers: {
    selectWizardTab: (state, action: PayloadAction<string>) => {
      state.selectedTabId = action.payload;
    },
    setRunValidation: (state, action: PayloadAction<boolean>) => {
      state.runValidation = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetTemplatesState, () => initialState);

    builder.addCase(loadCustomTemplate.fulfilled, (state, action: PayloadAction<{ enableWizard: boolean }>) => {
      state.isWizardUpdating = false;
      state.enableWizard = action.payload.enableWizard;
    });

    builder.addCase(initializeWorkflowsData.pending, (state) => {
      state.isWizardUpdating = true;
      state.enableWizard = false;
    });

    builder.addCase(initializeWorkflowsData.fulfilled, (state) => {
      state.isWizardUpdating = false;
      state.enableWizard = true;
    });

    builder.addCase(deleteWorkflowData.pending, (state) => {
      state.isWizardUpdating = true;
    });

    builder.addCase(deleteWorkflowData.fulfilled, (state, action: PayloadAction<{ disableWizard: boolean }>) => {
      state.isWizardUpdating = false;
      if (action.payload.disableWizard) {
        state.enableWizard = false;
      }
    });
  },
});

export const { selectWizardTab, setRunValidation } = tabSlice.actions;
export default tabSlice.reducer;
