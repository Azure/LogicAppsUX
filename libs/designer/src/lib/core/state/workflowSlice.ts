import { initializeGraphState } from '../parsers/ParseReduxAction';
import type { AddNodePayload } from '../parsers/addNodeToWorkflow';
import { addNodeToWorkflow, insertMiddleWorkflowEdge, setWorkflowEdge } from '../parsers/addNodeToWorkflow';
import type { WorkflowGraph, WorkflowNode } from '../parsers/models/workflowNode';
import { isWorkflowNode } from '../parsers/models/workflowNode';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { NodeChange, NodeDimensionChange } from 'react-flow-renderer';

type SpecTypes = 'BJS' | 'CNCF';

export interface NodesMetadata {
  [nodeId: string]: {
    graphId: string;
    isPlaceholderNode?: boolean;
  };
}

export type Operations = Record<string, LogicAppsV2.OperationDefinition>;
export interface WorkflowState {
  workflowSpec?: SpecTypes;
  graph: WorkflowGraph | null;
  operations: Operations;
  nodesMetadata: NodesMetadata;
}

export const initialWorkflowState: WorkflowState = {
  workflowSpec: 'BJS',
  graph: null,
  operations: {},
  nodesMetadata: {},
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState: initialWorkflowState,
  reducers: {
    initWorkflowSpec: (state, action: PayloadAction<SpecTypes>) => {
      state.workflowSpec = action.payload;
    },
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => {
      if (!state.graph) {
        return;
      }

      addNodeToWorkflow(action.payload, state.graph, state.nodesMetadata);

      if (action.payload.parentId) {
        const newNodeId = action.payload.id;
        const childId = action.payload.childId;
        const parentId = action.payload.parentId;

        setWorkflowEdge(parentId, newNodeId, state.graph);

        if (childId) {
          insertMiddleWorkflowEdge(parentId, newNodeId, childId, state.graph);
        }
      }
      // Danielle still need to add to Actions, will complete later in S10! https://msazure.visualstudio.com/DefaultCollection/One/_workitems/edit/14429900
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
      state.operations = action.payload.actionData;
      state.nodesMetadata = action.payload.nodesMetadata;
    });
  },
});

// Action creators are generated for each case reducer function
export const { initWorkflowSpec, addNode, updateNodeSizes } = workflowSlice.actions;

export default workflowSlice.reducer;
