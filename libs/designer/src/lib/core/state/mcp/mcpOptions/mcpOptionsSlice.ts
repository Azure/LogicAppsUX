import { createSlice } from '@reduxjs/toolkit';
import { setInitialData, setLogicApp } from '../resourceSlice';
import { resetMcpState } from '../../global';
import { initializeMcpServices, resetMcpStateOnResourceChange } from '../../../actions/bjsworkflow/mcp';

export interface McpOptionsState {
  servicesInitialized: boolean;
  disableConfiguration: boolean;
  reInitializeServices?: boolean;
  resourceDetails?: {
    subscriptionId: string;
    resourceGroup: string;
    location: string;
  };
}

const initialState: McpOptionsState = {
  servicesInitialized: false,
  disableConfiguration: true,
};

export const mcpOptionsSlice = createSlice({
  name: 'mcpOptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
    builder.addCase(resetMcpStateOnResourceChange.fulfilled, (state, action) => {
      state.reInitializeServices = !action.payload;
      state.disableConfiguration = false;
    });
    builder.addCase(initializeMcpServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
    builder.addCase(setLogicApp, (state, action) => {
      state.reInitializeServices = !!action.payload?.logicAppName;
    });
    builder.addCase(setInitialData, (state, action) => {
      state.resourceDetails = {
        subscriptionId: action.payload.subscriptionId,
        resourceGroup: action.payload.resourceGroup,
        location: action.payload.location,
      };
    });
  },
});

export default mcpOptionsSlice.reducer;
