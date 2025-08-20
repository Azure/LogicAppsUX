import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

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

export const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {
    setResourceData: (state, action: PayloadAction<ResourceState>) => {
      const { subscriptionId, resourceGroup, location, logicAppName } = action.payload;

      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.location = location;
      state.logicAppName = logicAppName;
    },
  },
});

export const { setResourceData } = resourceSlice.actions;
export default resourceSlice.reducer;
