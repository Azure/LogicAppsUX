import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface ResourceDetails {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

export interface WorkflowState {
  existingWorkflowName?: string;
  existingWorkflowNames: string[];
  isConsumption: boolean;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
}

const initialState: WorkflowState = {
  isConsumption: false,
  existingWorkflowNames: [],
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
    setExistingWorkflowNames: (state, action: PayloadAction<string[]>) => {
      state.existingWorkflowNames = action.payload;
    },
    setResourceDetails: (state, action: PayloadAction<ResourceDetails>) => {
      state.subscriptionId = action.payload.subscriptionId;
      state.resourceGroup = action.payload.resourceGroup;
      state.location = action.payload.location;
    },
    clearWorkflowDetails: (state) => {
      state.existingWorkflowName = undefined;
      state.existingWorkflowNames = [];
    },
    setConsumption: (state, action: PayloadAction<boolean>) => {
      state.isConsumption = action.payload;
      state.existingWorkflowName = undefined;
    },
  },
});

export const { setExistingWorkflowName, setExistingWorkflowNames, setResourceDetails, clearWorkflowDetails, setConsumption } =
  workflowSlice.actions;
export default workflowSlice.reducer;
