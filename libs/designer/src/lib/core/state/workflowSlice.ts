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
      // const { childId, parentId, id, graph = 'root' } = action.payload;
      // const parentNode = state.nodes[action.payload.parentId];
      // if (childId) {
      //   state.nodes[childId] = {
      //     ...state.nodes[childId],
      //     parentNodes: [...state.nodes[childId].childrenNodes.filter((y) => y !== parentId), id],
      //   };
      // }
      // state.nodes[parentId] = {
      //   ...state.nodes[parentId],
      //   childrenNodes: childId ? [...state.nodes[parentId].childrenNodes.filter((y) => y !== childId), id] : [id],
      // };
      // state.nodes[id] = {
      //   id: action.payload.id,
      //   type: '',
      //   operation: null as any,
      //   position: {
      //     x: state.nodes[parentId]?.position.x ?? 0,
      //     y: state.nodes[parentId]?.position.y ?? 0,
      //   },
      //   size: { height: 172, width: 38 },
      //   parentNodes: [action.payload.parentId],
      //   childrenNodes: action.payload.childId ? [action.payload.childId] : [...(parentNode?.childrenNodes ?? [])],
      // };
      // state.graphs[graph].nodes.push(id);
    },
    updateNodeSizes: (state: WorkflowState, action: PayloadAction<NodeChange[]>) => {
      const dimensionChanges = action.payload.filter((x) => x.type === 'dimensions');
      if (!state.graph) {
        return;
      }
      const stack: (WorkflowGraph | WorkflowNode)[] = [state.graph];
      while (stack.length) {
        const node = stack.shift();
        const change = dimensionChanges.find((x) => x.id === node?.id);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        if (change && isWorkflowNode(node!)) {
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
