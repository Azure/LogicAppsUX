import { createSlice } from '@reduxjs/toolkit';
import { setLogicAppId } from './resourceSlice';
import { resetMcpState } from '../global';
import { initializeMcpServices, resetMcpStateOnResourceChange } from '../../actions/bjsworkflow/mcp';

export interface McpOptionsState {
  servicesInitialized: boolean;
  reInitializeServices?: boolean;
}

const initialState: McpOptionsState = {
  servicesInitialized: false,
};

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
