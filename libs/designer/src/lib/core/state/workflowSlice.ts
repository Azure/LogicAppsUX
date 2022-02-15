import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NodeChange, NodeDimensionChange } from 'react-flow-renderer';
import { isWorkflowNode, WorkflowGraph, WorkflowNode } from '../parsers/models/workflowNode';
import { initializeGraphState } from '../parsers/ParseReduxAction';

type SpecTypes = 'BJS' | 'CNCF';

interface ActionLocation {
  scope?: string;
}

export type Actions = Record<string, LogicAppsV2.ActionDefinition & ActionLocation>;
export interface WorkflowState {
  workflowSpec?: SpecTypes;
  graph?: WorkflowGraph | null;
  actions: Actions;
}

const initialState: WorkflowState = {
  workflowSpec: 'BJS',
  graph: null,
  actions: {},
};

interface AddNodePayload {
  id: string;
  parentId: string;
  childId?: string;
  graph?: string;
}

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    initWorkflowSpec: (state, action: PayloadAction<SpecTypes>) => {
      state.workflowSpec = action.payload;
    },
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => {
      // TODO: Add node addition
    },
    updateNodeSizes: (state: WorkflowState, action: PayloadAction<NodeChange[]>) => {
      const dimensionChanges = action.payload.filter((x) => x.type === 'dimensions');
      if (!state.graph) {
        return;
      }
      const stack: (WorkflowGraph | WorkflowNode)[] = [state.graph];
      const dimensionChangesById = dimensionChanges.reduce<Record<string, NodeDimensionChange>>((acc, val) => {
        if (val.type !== 'dimensions') {
          return acc;
        }
        return {
          ...acc,
          [val.id]: val,
        };
      }, {});
      while (stack.length) {
        const node = stack.shift();
        const change = dimensionChangesById[node?.id ?? ''];
        if (change && node && isWorkflowNode(node)) {
          const c = change as NodeDimensionChange;
          node.height = c.dimensions.height;
          node.width = c.dimensions.width;
        }
        node?.children && stack.push(...node.children);
      }
    },
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(initializeGraphState.fulfilled, (state, action) => {
      state.graph = action.payload.graph;
      state.actions = action.payload.actionData;
    });
  },
});

// Action creators are generated for each case reducer function
export const { initWorkflowSpec, addNode, updateNodeSizes } = workflowSlice.actions;

export default workflowSlice.reducer;
