import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../global';

export interface ResourceState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  logicAppName?: string;
}

const initialState: ResourceState = {
  subscriptionId: '',
  resourceGroup: '',
  location: '',
};

interface InitialResourceState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {
    setInitialData: (state, action: PayloadAction<InitialResourceState>) => {
      const { subscriptionId, resourceGroup, location } = action.payload;

      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.location = location;
    },
    setLogicApp: (state, action: PayloadAction<InitialResourceState & { logicAppName: string }>) => {
      const { subscriptionId, resourceGroup, location, logicAppName } = action.payload;
      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.location = location;
      state.logicAppName = logicAppName;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
  },
});

export const { setInitialData, setLogicApp } = resourceSlice.actions;
export default resourceSlice.reducer;
