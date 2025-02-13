import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { initializeTemplateServices } from '../../actions/bjsworkflow/templates';

export interface TemplateOptionsState {
  servicesInitialized: boolean;
  viewTemplateDetails?: Template.ViewTemplateDetails;
}

const initialState: TemplateOptionsState = {
  servicesInitialized: false,
};

export const templateOptionsSlice = createSlice({
  name: 'templateOptions',
  initialState,
  reducers: {
    setViewTemplateDetails: (state, action: PayloadAction<Template.ViewTemplateDetails>) => {
      state.viewTemplateDetails = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(initializeTemplateServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
  },
});

export const { setViewTemplateDetails } = templateOptionsSlice.actions;
export default templateOptionsSlice.reducer;
