import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface WorkflowNode {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
}
export interface WorkflowState {
  nodes: WorkflowNode[];
}

const initialState: WorkflowState = {
  nodes: [],
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    initialize: (state, action: PayloadAction<LogicAppsV2.WorkflowDefinition>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library,
      // which detects changes to a "draft state" and produces a brand new
      // immutable state based off those changes
      console.log(action.payload);
      state.nodes = [];
    },
  },
});

// Action creators are generated for each case reducer function
export const { initialize } = workflowSlice.actions;

export default workflowSlice.reducer;
