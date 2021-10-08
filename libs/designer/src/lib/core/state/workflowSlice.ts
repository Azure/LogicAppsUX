import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Elements, Node } from 'react-flow-renderer';
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
  nodes: Record<string, WorkflowNode>;
  shouldLayout: boolean;
  shouldZoomToNode?: string | null;
}

const initialState: WorkflowState = {
  nodes: {},
  graphs: {},
  shouldLayout: false,
  shouldZoomToNode: null,
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
    triggerLayout: (state) => {
      state.shouldLayout = true;
    },
    setShouldZoomToNode: (state, action: PayloadAction<string | null>) => {
      state.shouldZoomToNode = action.payload;
    },
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => {
      const { childId, parentId, id, graph = 'root' } = action.payload;
      const parentNode = state.nodes[action.payload.parentId];
      if (childId) {
        state.nodes[childId] = {
          ...state.nodes[childId],
          parentNodes: [...state.nodes[childId].childrenNodes.filter((y) => y !== parentId), id],
        };
      }

      state.nodes[parentId] = {
        ...state.nodes[parentId],
        childrenNodes: childId ? [...state.nodes[parentId].childrenNodes.filter((y) => y !== childId), id] : [id],
      };

      state.nodes[id] = {
        id: action.payload.id,
        type: '',
        operation: null as any,
        position: {
          x: state.nodes[parentId]?.position.x ?? 0,
          y: state.nodes[parentId]?.position.y ?? 0,
        },
        size: { height: 172, width: 38 },
        parentNodes: [action.payload.parentId],
        childrenNodes: action.payload.childId ? [action.payload.childId] : [...(parentNode?.childrenNodes ?? [])],
      };

      state.graphs[graph].nodes.push(id);
    },
    updateNodeSizes: (state: WorkflowState, action: PayloadAction<Elements>) => {
      const elements = action.payload;

      elements.forEach((el) => {
        if (state.nodes[el.id]) {
          const nodeEl = el as Node<unknown>;
          state.nodes[el.id].size = { height: nodeEl.__rf?.height, width: nodeEl.__rf?.width };
        }
      });
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
      state.shouldLayout = false;
    });
    builder.addCase(processGraphLayout.rejected, (state, action) => {
      console.log(action.error);
    });
  },
});

// Action creators are generated for each case reducer function
export const { initWorkflowSpec, addNode, updateNodeSizes, triggerLayout, setShouldZoomToNode } = workflowSlice.actions;

export default workflowSlice.reducer;
