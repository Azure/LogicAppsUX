import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Elements, FlowElement, Node } from 'react-flow-renderer';
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
  shouldLayout: boolean;
}

const initialState: WorkflowState = {
  nodes: [],
  graphs: {},
  shouldLayout: false,
};

interface AddNodePayload {
  id: string;
  parentId: string;
  childId?: string;
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
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => {
      const childNode = state.nodes.find((x) => x.id === action.payload.childId);
      const nodes = [
        ...state.nodes.map((x) => {
          if (x.id === action.payload.parentId) {
            return {
              ...x,
              childrenNodes: [...x.childrenNodes.filter((y) => y !== action.payload.childId), action.payload.id],
            };
          }
          if (x.id === action.payload.childId) {
            return {
              ...x,
              parentNodes: [...x.childrenNodes.filter((y) => y !== action.payload.parentId), action.payload.id],
            };
          }
          return x;
        }),
      ];
      const iof = nodes.findIndex((x) => x.id === action.payload.childId);

      nodes.splice(iof, 0, {
        id: action.payload.id,
        type: '',
        operation: null as any,
        position: { x: childNode?.position.x ?? 0, y: childNode?.position.y ?? 0 },
        size: { height: 172, width: 38 },
        parentNodes: [action.payload.parentId],
        childrenNodes: action.payload.childId ? [action.payload.childId] : [],
      });
      state.nodes = [...nodes];
    },
    updateNodeSizes: (state: WorkflowState, action: PayloadAction<Elements>) => {
      const elements = action.payload;
      const elementMap = elements.reduce((acc, val) => {
        acc.set(val.id, val as Node);
        return acc;
      }, new Map<string, Node<any>>());
      state.nodes = state.nodes.map((node) => {
        const element = elementMap.get(node.id);
        if (!element) {
          return node;
        }
        return {
          ...node,
          size: { height: element.__rf?.height, width: element.__rf?.width },
        };
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
      console.log('rejected');
    });
  },
});

// Action creators are generated for each case reducer function
export const { initWorkflowSpec, addNode, updateNodeSizes, triggerLayout } = workflowSlice.actions;

export default workflowSlice.reducer;
