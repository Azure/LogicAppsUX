import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface WorkflowState {
  workflowName?: string;
  isConsumption: boolean;
  subscriptionId?: string;
  location?: string;
  resourceGroup?: string;
  topResourceName?: string;
}

const initialState: WorkflowState = {
  isConsumption: false,
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    clearWorkflowDetails: (state) => {
      state.workflowName = undefined;
    },
    setConsumption: (state, action: PayloadAction<boolean>) => {
      state.isConsumption = action.payload;
      state.workflowName = undefined;
    },
    setSubscriptionId: (state, action: PayloadAction<string>) => {
      state.subscriptionId = action.payload;
    },
    setLocation: (state, action: PayloadAction<string>) => {
      state.location = action.payload;
    },
    setResourceGroup: (state, action: PayloadAction<string>) => {
      state.resourceGroup = action.payload;
    },
    setTopResourceName: (state, action: PayloadAction<string>) => {
      state.topResourceName = action.payload;
    },
  },
});

export const {
  setWorkflowName,
  clearWorkflowDetails,
  setConsumption,
  setSubscriptionId,
  setLocation,
  setResourceGroup,
  setTopResourceName,
} = workflowSlice.actions;
