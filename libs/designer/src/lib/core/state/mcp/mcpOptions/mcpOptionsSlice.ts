import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice, isAnyOf } from '@reduxjs/toolkit';
import { setInitialData, setLocation, setResourceGroup, setSubscription } from '../resourceSlice';
import { resetMcpState } from '../../global';
import { InitHostService, InitSearchService } from '@microsoft/logic-apps-shared';
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
    builder.addCase(setInitialData, (state, action: PayloadAction<any | { reloadServices: boolean }>) => {
      state.reInitializeServices = !!action.payload.reloadServices;
    });
    builder.addCase(initializeServices.fulfilled, (state, action) => {
      state.servicesInitialized = action.payload;
    });
    builder.addMatcher(isAnyOf(setSubscription, setResourceGroup, setLocation), (state, action) => {
      state.reInitializeServices = !!action.payload;
    });
  },
});

export default mcpOptionsSlice.reducer;
