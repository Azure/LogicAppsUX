import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface WorkflowState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  workflowAppName: string;
  logicAppName: string;
}

export interface SourceWorkflowState extends WorkflowState {
  lockField?: boolean; // Indicates if this field is locked & cannot be modified/removed
}

export interface CloneState {
  sourceApps: SourceWorkflowState[];
  destinationApp: WorkflowState;
}

const initialState: CloneState = {
  sourceApps: [],
  destinationApp: {
    subscriptionId: '',
    resourceGroup: '',
    location: '',
    workflowAppName: '',
    logicAppName: '',
  },
};

export const cloneSlice = createSlice({
  name: 'clone',
  initialState,
  reducers: {
    setDestinationSubscription: (state, action: PayloadAction<string>) => {
      state.destinationApp.subscriptionId = action.payload;
    },
    setDestinationResourceGroup: (state, action: PayloadAction<string>) => {
      state.destinationApp.resourceGroup = action.payload;
    },
    setDestinationWorkflowAppDetails: (state, action: PayloadAction<{ name: string; location: string }>) => {
      state.destinationApp.logicAppName = action.payload.name;
      state.destinationApp.location = action.payload.location;
    },
  },
});

export const { setDestinationSubscription, setDestinationResourceGroup, setDestinationWorkflowAppDetails } = cloneSlice.actions;
export default cloneSlice.reducer;
