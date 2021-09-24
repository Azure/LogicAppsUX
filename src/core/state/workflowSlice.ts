import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WorkflowNode } from '../parsers/models/workflowNode';
import { initializeGraphState } from '../parsers/ParseReduxAction';

type SpecTypes = 'BJS' | 'CNCF';
export interface WorkflowState {
  rootGraph?: string;
  workflowSpec?: SpecTypes;
  graphs: {
    [key: string]: {
      root: string;
      nodes: string[];
    };
  };
  nodes: WorkflowNode[];
}

const initialState: WorkflowState = {
  nodes: [],
  graphs: {},
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    initWorkflowSpec: (state, action: PayloadAction<SpecTypes>) => {
      state.workflowSpec = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(initializeGraphState.fulfilled, (state, action) => {
      console.log(state);
      console.log(action);
    });
  },
});

// Action creators are generated for each case reducer function
export const { initWorkflowSpec } = workflowSlice.actions;

export default workflowSlice.reducer;
