import { initializeGraphState } from '../parsers/ParseReduxAction';
import { addWorkflowNode, createNodeWithDefaultSize, insertMiddleWorkflowEdge, setWorkflowEdge } from '../parsers/addNodeToWorkflow';
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

export type Actions = Record<string, LogicAppsV2.ActionDefinition>;
export interface WorkflowState {
  workflowSpec?: SpecTypes;
  graph: WorkflowGraph | null;
  actions: Actions;
  nodesMetadata: NodesMetadata;
}

const initialState: WorkflowState = {
  workflowSpec: 'BJS',
  graph: null,
  actions: {},
  nodesMetadata: {},
};

export interface AddNodePayload {
  id: string;
  parentId?: string;
  childId?: string;
  graphId: string;
}

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState,
  reducers: {
    initWorkflowSpec: (state, action: PayloadAction<SpecTypes>) => {
      state.workflowSpec = action.payload;
    },
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => {
      if (!state.graph) {
        return;
      }
      if (action.payload.parentId) {
        const newNodeId = action.payload.id;
        const childId = action.payload.childId;
        const parentId = action.payload.parentId;
        const workflowNode: WorkflowNode = createNodeWithDefaultSize(newNodeId);

        addWorkflowNode(workflowNode, state.graph);
        setWorkflowEdge(parentId, newNodeId, state.graph);

        if (childId) {
          insertMiddleWorkflowEdge(parentId, newNodeId, childId, state.graph);
        }
      }
      // danielle: then add to actions[] ? this might happen in RQ now
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
      state.nodesMetadata = action.payload.nodesMetadata;
    });
  },
});

// Action creators are generated for each case reducer function
export const { initWorkflowSpec, addNode, updateNodeSizes } = workflowSlice.actions;

export default workflowSlice.reducer;
