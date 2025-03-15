import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { initializeTemplateServices, resetStateOnResourceChange } from '../../actions/bjsworkflow/templates';
import { resetTemplatesState } from '../global';
import { setLocation, setResourceGroup, setSubscription } from './workflowSlice';

export interface TemplateOptionsState {
  servicesInitialized: boolean;
  enableResourceSelection?: boolean;
  reInitializeServices?: boolean;
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
    setEnableResourceSelection: (state, action: PayloadAction<boolean>) => {
      state.enableResourceSelection = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetTemplatesState, () => initialState);
    builder.addCase(initializeTemplateServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
    builder.addCase(resetStateOnResourceChange.fulfilled, (state, action) => {
      state.reInitializeServices = !action.payload;
    });
    builder.addMatcher(isAnyOf(setSubscription, setResourceGroup, setLocation), (state, action) => {
      state.reInitializeServices = !!action.payload;
    });
  },
});

export const { setViewTemplateDetails, setEnableResourceSelection } = templateOptionsSlice.actions;
export default templateOptionsSlice.reducer;
