import type { Template } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { initializeTemplateServices, resetStateOnResourceChange } from '../../actions/bjsworkflow/templates';
import { resetTemplatesState } from '../global';
import { setInitialData, setLocation, setLogicAppDetails, setResourceGroup, setSubscription, setWorkflowAppDetails } from './workflowSlice';
import { initializeConfigureTemplateServices } from '../../actions/bjsworkflow/configuretemplate';

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
    builder.addCase(resetStateOnResourceChange.fulfilled, (state, action) => {
      state.reInitializeServices = !action.payload;
    });
    builder.addCase(setInitialData, (state, action: PayloadAction<any | { reloadServices: boolean }>) => {
      state.reInitializeServices = !!action.payload.reloadServices;
    });
    builder.addMatcher(isAnyOf(initializeTemplateServices.fulfilled, initializeConfigureTemplateServices.fulfilled), (state, action) => {
      state.servicesInitialized = action.payload;
    });
    builder.addMatcher(isAnyOf(setWorkflowAppDetails, setLogicAppDetails), (state, action) => {
      state.reInitializeServices = !!action.payload.name;
    });
    builder.addMatcher(isAnyOf(setSubscription, setResourceGroup, setLocation), (state, action) => {
      state.reInitializeServices = !!action.payload;
    });
  },
});

export const { setViewTemplateDetails, setEnableResourceSelection } = templateOptionsSlice.actions;
export default templateOptionsSlice.reducer;
