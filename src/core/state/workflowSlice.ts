import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ScopedNode, WorkflowNode } from '../parsers/models/workflowNode';
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
      console.log('action happened');
      console.log(action.payload);
      state.nodes.push({
        id: 'test',
        type: 'Scoped',
        data: { label: 'test' },
        position: { x: 0, y: 0 },
        parentNodes: [],
        childrenNodes: [],
        subgraph_id: '',
      } as ScopedNode);
    });
  },
});

// Action creators are generated for each case reducer function
export const { initWorkflowSpec } = workflowSlice.actions;

export default workflowSlice.reducer;
