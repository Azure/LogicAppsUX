import { initializeGraphState } from '../../parsers/ParseReduxAction';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import { addNodeToWorkflow, insertMiddleWorkflowEdge, setWorkflowEdge } from '../../parsers/addNodeToWorkflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { WORKFLOW_EDGE_TYPES, isWorkflowNode } from '../../parsers/models/workflowNode';
import { LogEntryLevel, LoggerService } from '@microsoft-logic-apps/designer-client-services';
import type { SubgraphType } from '@microsoft-logic-apps/utils';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { NodeChange, NodeDimensionChange } from 'react-flow-renderer';

type SpecTypes = 'BJS' | 'CNCF';

export interface NodesMetadata {
  [nodeId: string]: {
    graphId: string;
    parentNodeId?: string;
    subgraphType?: SubgraphType;
    actionCount?: number;
    isRoot?: boolean;
  };
}

export type Operations = Record<string, LogicAppsV2.OperationDefinition>;

export interface WorkflowState {
  workflowSpec?: SpecTypes;
  graph: WorkflowNode | null;
  operations: Operations;
  nodesMetadata: NodesMetadata;
  collapsedGraphIds: Record<string, boolean>;
  edgeIdsBySource: Record<string, string[]>;
}

export const initialWorkflowState: WorkflowState = {
  workflowSpec: 'BJS',
  graph: null,
  operations: {},
  nodesMetadata: {},
  collapsedGraphIds: {},
  edgeIdsBySource: {},
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState: initialWorkflowState,
  reducers: {
    initWorkflowSpec: (state: WorkflowState, action: PayloadAction<SpecTypes>) => {
      state.workflowSpec = action.payload;
    },
    setNodeDescription: (state: WorkflowState, action: PayloadAction<{ nodeId: string; description?: string }>) => {
      const { nodeId, description } = action.payload;
      state.operations[nodeId].description = description;
    },
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => {
      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: 'New Action Node Added',
        args: [action.payload],
      });
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
      const stack: WorkflowNode[] = [state.graph];
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
        !!node?.children?.length && stack.push(...node.children);
      }
    },
    setCollapsedGraphIds: (state: WorkflowState, action: PayloadAction<Record<string, boolean>>) => {
      state.collapsedGraphIds = action.payload;
    },
    toggleCollapsedGraphId: (state: WorkflowState, action: PayloadAction<string>) => {
      if (state.collapsedGraphIds?.[action.payload] === true) delete state.collapsedGraphIds[action.payload];
      else state.collapsedGraphIds[action.payload] = true;
    },
    discardAllChanges: (_state: WorkflowState) => {
      // Will implement later, currently here to test host dispatch
      LoggerService().log({
        message: 'Changes Discarded',
        level: LogEntryLevel.Verbose,
        area: 'workflowSlice.ts',
      });
    },
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(initializeGraphState.fulfilled, (state, action) => {
      state.graph = action.payload.graph;
      state.operations = action.payload.actionData;
      state.nodesMetadata = action.payload.nodesMetadata;

      const traverseGraph = (graph: WorkflowNode) => {
        const edges = graph.edges?.filter((e) => e.type !== WORKFLOW_EDGE_TYPES.HIDDEN_EDGE);
        if (edges) {
          edges.forEach((edge) => {
            if (!state.edgeIdsBySource[edge.source]) state.edgeIdsBySource[edge.source] = [];
            state.edgeIdsBySource[edge.source].push(edge.target);
          });
        }
        if (graph.children) graph.children.forEach((child) => traverseGraph(child));
      };
      traverseGraph(action.payload.graph);
    });
  },
});

// Action creators are generated for each case reducer function
export const {
  initWorkflowSpec,
  addNode,
  updateNodeSizes,
  setNodeDescription,
  setCollapsedGraphIds,
  toggleCollapsedGraphId,
  discardAllChanges,
} = workflowSlice.actions;

export default workflowSlice.reducer;
