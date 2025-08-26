import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ResourceState {
  subscriptionId: string;
  resourceGroup: string;
  logicAppName: string;
}

const initialState: ResourceState = {
  subscriptionId: '',
  resourceGroup: '',
  logicAppName: '',
};

export const resourceSlice = createSlice({
  name: 'resource',
  initialState,
  reducers: {
    setResourceData: (state, action: PayloadAction<ResourceState>) => {
      const { subscriptionId, resourceGroup, logicAppName } = action.payload;

      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.logicAppName = logicAppName;
    },
  },
});

export const { setResourceData } = resourceSlice.actions;
export default resourceSlice.reducer;
