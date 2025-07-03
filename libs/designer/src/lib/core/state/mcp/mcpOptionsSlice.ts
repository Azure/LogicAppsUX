import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import { setInitialData, setLocation, setResourceGroup, setSubscription } from './workflowSlice';
import { resetMcpState } from '../global';

export interface TemplateOptionsState {
  servicesInitialized: boolean;
  reInitializeServices?: boolean;
}

const initialState: TemplateOptionsState = {
  servicesInitialized: false,
};

export const mcpOptionsSlice = createSlice({
  name: 'mcpOptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
    // TODO: after the services initialization is implemented
    // builder.addCase(resetStateOnResourceChange.fulfilled, (state, action) => {
    //   state.reInitializeServices = !action.payload;
    // });
    builder.addCase(setInitialData, (state, action: PayloadAction<any | { reloadServices: boolean }>) => {
      state.reInitializeServices = !!action.payload.reloadServices;
    });
    // TODO: after the services initialization is implemented
    // builder.addMatcher(isAnyOf(initializeTemplateServices.fulfilled, initializeConfigureTemplateServices.fulfilled), (state, action) => {
    //   state.servicesInitialized = action.payload;
    // });
    builder.addMatcher(isAnyOf(setSubscription, setResourceGroup, setLocation), (state, action) => {
      state.reInitializeServices = !!action.payload;
    });
  },
});

export default mcpOptionsSlice.reducer;
