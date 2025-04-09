import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetTemplatesState } from '../global';
import { deleteWorkflowData, initializeWorkflowsData, loadCustomTemplate } from '../../actions/bjsworkflow/configuretemplate';

export interface TabState {
  selectedTabId: string | undefined;
  enableWizard: boolean;
}

const initialState: TabState = {
  selectedTabId: undefined,
  enableWizard: false,
};

export const tabSlice = createSlice({
  name: 'tab',
  initialState,
  reducers: {
    selectWizardTab: (state, action: PayloadAction<string>) => {
      state.selectedTabId = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetTemplatesState, () => initialState);

    builder.addCase(loadCustomTemplate.fulfilled, (state, action: PayloadAction<{ enableWizard: boolean }>) => {
      state.enableWizard = action.payload.enableWizard;
    });

    builder.addCase(initializeWorkflowsData.fulfilled, (state) => {
      state.enableWizard = true;
    });

    builder.addCase(deleteWorkflowData.fulfilled, (state, action: PayloadAction<{ disableWizard: boolean }>) => {
      if (action.payload.disableWizard) {
        state.enableWizard = false;
      }
    });
  },
});

export const { selectWizardTab } = tabSlice.actions;
export default tabSlice.reducer;
