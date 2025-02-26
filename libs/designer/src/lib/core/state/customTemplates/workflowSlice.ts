import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { ConnectionReferences } from '../../../common/models/workflow';

export interface ConnectionMapping {
  references: ConnectionReferences;
  mapping: Record<string, string>;
}

export interface WorkflowState {
  isConsumption: boolean;
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  workflowAppName?: string;
  connections: ConnectionMapping;
  parameters: Record<string, any>; //TODO: Enforce type
}

const initialState: WorkflowState = {
  isConsumption: false,
  subscriptionId: '',
  resourceGroup: '',
  location: '',
  connections: {
    references: {},
    mapping: {},
  },
  parameters: {},
};

interface InitialWorkflowState {
  subscriptionId: string;
  resourceGroup: string;
  location: string;
  workflowAppName?: string;
  references: ConnectionReferences;
}

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setInitialData: (state, action: PayloadAction<InitialWorkflowState>) => {
      const { subscriptionId, resourceGroup, location, workflowAppName, references } = action.payload;
      state.subscriptionId = subscriptionId;
      state.resourceGroup = resourceGroup;
      state.location = location;
      state.workflowAppName = workflowAppName;
      state.connections.references = references;
    },
    setSubscriptionId: (state, action: PayloadAction<string>) => {
      state.subscriptionId = action.payload;
    },
    setResourceGroup: (state, action: PayloadAction<string>) => {
      state.resourceGroup = action.payload;
    },
    setWorkflowAppName: (state, action: PayloadAction<string>) => {
      state.workflowAppName = action.payload;
    },
  },
});

export const { setInitialData, setSubscriptionId, setResourceGroup, setWorkflowAppName } = workflowSlice.actions;
export default workflowSlice.reducer;
