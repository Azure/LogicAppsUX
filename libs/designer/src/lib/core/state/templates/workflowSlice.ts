import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface WorkflowState {
  appId?: string;
  workflowName?: string;
  isConsumption: boolean;
}

const initialState: WorkflowState = {
  appId: undefined,
  isConsumption: false,
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setAppid: (state, action: PayloadAction<string>) => {
      state.appId = action.payload;
    },
    setWorkflowName: (state, action: PayloadAction<string>) => {
      state.workflowName = action.payload;
    },
    clearWorkflowDetails: (state) => {
      state.appId = undefined;
      state.workflowName = undefined;
    },
    setConsumption: (state, action: PayloadAction<boolean>) => {
      state.isConsumption = action.payload;
      state.appId = undefined;
      state.workflowName = undefined;
    },
  },
});

export const { setAppid, setWorkflowName, clearWorkflowDetails, setConsumption } = workflowSlice.actions;
