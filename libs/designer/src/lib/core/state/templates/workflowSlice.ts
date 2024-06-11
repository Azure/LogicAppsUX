import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface WorkflowState {
  existingWorkflowName?: string;
  isConsumption: boolean;
}

const initialState: WorkflowState = {
  isConsumption: false,
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    setExistingWorkflowName: (state, action: PayloadAction<string>) => {
      state.existingWorkflowName = action.payload;
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

export const { setExistingWorkflowName, clearWorkflowDetails, setConsumption } = workflowSlice.actions;
export default workflowSlice.reducer;
