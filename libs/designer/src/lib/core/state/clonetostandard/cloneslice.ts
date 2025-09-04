import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { getCloneWorkflowName } from '../../../core/clonetostandard/utils/helper';

export interface WorkflowState {
  subscriptionId: string;
  resourceGroup: string;
  logicAppName: string;
}

export interface SourceWorkflowState extends WorkflowState {
  lockField?: boolean; // Indicates if this field is locked & cannot be modified/removed
  targetWorkflowName: string;
  targetWorkflowNameValidationError?: string;
}

export interface TargetWorkflowState extends WorkflowState {
  location: string;
}

export interface CloneState {
  sourceApps: SourceWorkflowState[];
  destinationApp: TargetWorkflowState;
  errorMessage: string | undefined;
  isSuccessfullyCloned: boolean;
}

const initialState: CloneState = {
  sourceApps: [],
  destinationApp: {
    subscriptionId: '',
    resourceGroup: '',
    location: '',
    logicAppName: '',
  },
  errorMessage: undefined,
  isSuccessfullyCloned: false,
};

export const cloneSlice = createSlice({
  name: 'clone',
  initialState,
  reducers: {
    initializeSourceWithResource: (
      state,
      action: PayloadAction<{
        subscriptionId: string;
        resourceGroup: string;
        logicAppName: string;
      }>
    ) => {
      state.sourceApps = [{ ...action.payload, targetWorkflowName: getCloneWorkflowName(action.payload.logicAppName) }];
    },
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
    updateErrorMessage: (state, action: PayloadAction<string | undefined>) => {
      state.errorMessage = action.payload;
    },
    // Note: temporary while only supporting single case, to-be-changed once supporting multi.
    updateTargetWorkflowName: (state, action: PayloadAction<string>) => {
      const targetWorkflow = state.sourceApps[0];
      if (targetWorkflow) {
        targetWorkflow.targetWorkflowName = action.payload;
      }
    },
    // Note: temporary while only supporting single case, to-be-changed once supporting multi.
    updateTargetWorkflowNameValidationError: (state, action: PayloadAction<string | undefined>) => {
      const targetWorkflow = state.sourceApps[0];
      if (targetWorkflow) {
        targetWorkflow.targetWorkflowNameValidationError = action.payload;
      }
    },
    // Note: also temporary to indicate shutdown of experience, to-be-changed once design pattern is set with API change
    setSuccessfullyCloned: (state) => {
      state.isSuccessfullyCloned = true;
    },
  },
});

export const {
  initializeSourceWithResource,
  setDestinationSubscription,
  setDestinationResourceGroup,
  setDestinationWorkflowAppDetails,
  updateErrorMessage,
  updateTargetWorkflowName,
  updateTargetWorkflowNameValidationError,
  setSuccessfullyCloned,
} = cloneSlice.actions;
export default cloneSlice.reducer;
