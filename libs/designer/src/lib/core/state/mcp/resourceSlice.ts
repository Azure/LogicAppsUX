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
    setSubscription: (state, action: PayloadAction<string>) => {
      const subscriptionId = action.payload;
      state.subscriptionId = subscriptionId;
    },
    setResourceGroup: (state, action: PayloadAction<string>) => {
      const resourceGroup = action.payload;
      state.resourceGroup = resourceGroup;
    },
    setLocation: (state, action: PayloadAction<string>) => {
      const location = action.payload;
      state.location = location;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetMcpState, () => initialState);
  },
});

export const { setInitialData, setSubscription, setResourceGroup, setLocation } = resourceSlice.actions;
export default resourceSlice.reducer;
