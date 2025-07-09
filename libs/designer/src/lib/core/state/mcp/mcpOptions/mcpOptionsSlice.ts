import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { setLogicAppId } from '../resourceSlice';
import { resetMcpState } from '../../global';
import { InitHostService, InitSearchService } from '@microsoft/logic-apps-shared';
import { initializeMcpServices, resetMcpStateOnResourceChange } from '../../../actions/bjsworkflow/mcp';
import type { ServiceOptions } from './mcpOptionsInterface';

export interface McpOptionsState {
  servicesInitialized: boolean;
  reInitializeServices?: boolean;
}

const initialState: McpOptionsState = {
  servicesInitialized: false,
};

export const initializeServices = createAsyncThunk('initializeMCPServices', async ({ searchService, hostService }: ServiceOptions) => {
  InitSearchService(searchService);
  if (hostService) {
    InitHostService(hostService);
  }
  return true;
});

export const mcpOptionsSlice = createSlice({
  name: 'mcpOptions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
    builder.addCase(resetMcpStateOnResourceChange.fulfilled, (state, action) => {
      state.reInitializeServices = !action.payload;
    });
    builder.addCase(initializeMcpServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
    builder.addCase(setLogicAppId, (state, action) => {
      state.reInitializeServices = !!action.payload;
    });
  },
});

export default mcpOptionsSlice.reducer;
