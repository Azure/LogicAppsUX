import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface WorkflowState {
  workflowName?: string;
  isConsumption: boolean;
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
  },
});

export const { setWorkflowName, clearWorkflowDetails, setConsumption } = workflowSlice.actions;
