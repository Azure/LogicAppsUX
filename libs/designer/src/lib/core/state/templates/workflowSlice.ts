import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ResourceDetails {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export interface WorkflowState {
  existingWorkflowName?: string;
  isConsumption: boolean;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

const initialState: WorkflowState = {
  isConsumption: false,
  subscriptionId: '',
  resourceGroup: '',
  location: '',
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setExistingWorkflowName: (state, action: PayloadAction<string>) => {
      state.existingWorkflowName = action.payload;
    },
    setResourceDetails: (state, action: PayloadAction<ResourceDetails>) => {
      state.subscriptionId = action.payload.subscriptionId;
      state.resourceGroup = action.payload.resourceGroup;
      state.location = action.payload.location;
    },
    clearWorkflowDetails: (state) => {
      state.existingWorkflowName = undefined;
    },
    setConsumption: (state, action: PayloadAction<boolean>) => {
      state.isConsumption = action.payload;
      state.existingWorkflowName = undefined;
    },
  },
});

export const { setExistingWorkflowName, setResourceDetails, clearWorkflowDetails, setConsumption } = workflowSlice.actions;
export default workflowSlice.reducer;
