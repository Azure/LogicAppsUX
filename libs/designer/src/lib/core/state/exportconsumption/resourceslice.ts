import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { resetMcpState } from '../global';

export interface ResourceState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  logicAppName: string;
}

const initialState: ResourceState = {
  subscriptionId: '',
  resourceGroup: '',
  location: '',
  logicAppName: '',
};

interface InitialResourceState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  logicAppName: string;
}

export const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {
    setResourceData: (state, action: PayloadAction<InitialResourceState>) => {
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

export const { setResourceData } = resourceSlice.actions;
export default resourceSlice.reducer;
