import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WorkflowNode } from '../parsers/models/workflowNode';
import { initializeGraphState } from '../parsers/ParseReduxAction';
import { processGraphLayout } from '../parsers/ProcessLayoutReduxAction';
type SpecTypes = 'BJS' | 'CNCF';
export type Graph = {
  root: string;
  nodes: string[];
};
export type Graphs = {
  [key: string]: Graph;
};
export interface WorkflowState {
  rootGraph?: string;
  workflowSpec?: SpecTypes;
  graphs: Graphs;
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
      const { rootGraph, graphs, nodes } = action.payload;
      state.rootGraph = rootGraph;
      state.graphs = graphs;
      state.nodes = nodes;
    });
    builder.addCase(processGraphLayout.fulfilled, (state, action) => {
      state.nodes = action.payload;
    });
    builder.addCase(processGraphLayout.rejected, (state, action) => {
      console.log(action.payload);
      console.log(action.error);
    });
  },
});

// Action creators are generated for each case reducer function
export const { initWorkflowSpec } = workflowSlice.actions;

export default workflowSlice.reducer;
