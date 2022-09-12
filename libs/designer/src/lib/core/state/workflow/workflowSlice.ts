import { initializeGraphState } from '../../parsers/ParseReduxAction';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import { addNodeToWorkflow } from '../../parsers/addNodeToWorkflow';
import type { DeleteNodePayload } from '../../parsers/deleteNodeFromWorkflow';
import { deleteNodeFromWorkflow } from '../../parsers/deleteNodeFromWorkflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { isWorkflowNode } from '../../parsers/models/workflowNode';
import type { SpecTypes, WorkflowState } from './workflowInterfaces';
import { getWorkflowNodeFromGraphState } from './workflowSelectors';
import { LogEntryLevel, LoggerService } from '@microsoft-logic-apps/designer-client-services';
import { equals, RUN_AFTER_STATUS, WORKFLOW_EDGE_TYPES } from '@microsoft-logic-apps/utils';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { NodeChange, NodeDimensionChange } from 'react-flow-renderer';

export const initialWorkflowState: WorkflowState = {
  workflowSpec: 'BJS',
  graph: null,
  operations: {},
  nodesMetadata: {},
  collapsedGraphIds: {},
  edgeIdsBySource: {},
  idReplacements: {},
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
      if (!state.graph) {
        return; // log exception
      }
      const graph = getWorkflowNodeFromGraphState(state, action.payload.discoveryIds.graphId);
      if (!graph) throw new Error('graph not set');

      addNodeToWorkflow(action.payload, graph, state.nodesMetadata, state);
      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: 'New Action Node Added',
        args: [action.payload],
      });
    },
    deleteNode: (state: WorkflowState, action: PayloadAction<DeleteNodePayload>) => {
      if (!state.graph) {
        return; // log exception
      }
      const graphId = state.nodesMetadata[action.payload.nodeId].graphId;
      const graph = getWorkflowNodeFromGraphState(state, graphId);
      if (!graph) throw new Error('graph not set');

      deleteNodeFromWorkflow(action.payload, graph, state.nodesMetadata, state);
      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: 'Action Node Deleted',
        args: [action.payload],
      });
    },
    setFocusNode: (state: WorkflowState, action: PayloadAction<string>) => {
      state.focusedCanvasNodeId = action.payload;
    },
    clearFocusNode: (state: WorkflowState) => {
      state.focusedCanvasNodeId = undefined;
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
    buildEdgeIdsBySource: (state: WorkflowState) => {
      if (!state.graph) return;

      const output: Record<string, string[]> = {};
      const traverseGraph = (graph: WorkflowNode) => {
        const edges = graph.edges?.filter((e) => e.type !== WORKFLOW_EDGE_TYPES.HIDDEN_EDGE);
        if (edges) {
          edges.forEach((edge) => {
            if (!output[edge.source]) output[edge.source] = [];
            output[edge.source].push(edge.target);
          });
        }
        if (graph.children) graph.children.forEach((child) => traverseGraph(child));
      };
      traverseGraph(state.graph);
      state.edgeIdsBySource = output;
    },
    removeEdgeFromRunAfter: (state: WorkflowState, action: PayloadAction<{ childOperationId: string; parentOperationId: string }>) => {
      const { childOperationId, parentOperationId } = action.payload;
      const parentOperation = state.operations[parentOperationId];
      const childOperation: LogicAppsV2.ActionDefinition = state.operations[childOperationId];
      if (!parentOperation || !childOperation) {
        return;
      }
      delete childOperation.runAfter?.[parentOperationId];

      const graphPath: string[] = [];
      let operationGraph = state.nodesMetadata[childOperationId];

      while (!equals(operationGraph.graphId, 'root')) {
        graphPath.push(operationGraph.graphId);
        operationGraph = state.nodesMetadata[operationGraph.graphId];
      }
      let graph = state.graph;
      for (const id of graphPath.reverse()) {
        graph = graph?.children?.find((x) => x.id === id) ?? null;
      }
      if (!graph) {
        return;
      }
      graph.edges = graph.edges?.filter((x) => x.source !== parentOperationId || x.target !== childOperationId) ?? [];
    },
    addEdgeFromRunAfter: (state: WorkflowState, action: PayloadAction<{ childOperationId: string; parentOperationId: string }>) => {
      const { childOperationId, parentOperationId } = action.payload;
      const parentOperation = state.operations[parentOperationId];
      const childOperation: LogicAppsV2.ActionDefinition = state.operations[childOperationId];
      if (!parentOperation || !childOperation) {
        return;
      }
      childOperation.runAfter = { ...(childOperation.runAfter ?? {}), [parentOperationId]: [RUN_AFTER_STATUS.SUCCEEDED] };

      const graphPath: string[] = [];
      let operationGraph = state.nodesMetadata[childOperationId];

      while (!equals(operationGraph.graphId, 'root')) {
        graphPath.push(operationGraph.graphId);
        operationGraph = state.nodesMetadata[operationGraph.graphId];
      }
      let graph = state.graph;
      for (const id of graphPath.reverse()) {
        graph = graph?.children?.find((x) => x.id === id) ?? null;
      }
      graph?.edges?.push({
        id: `${parentOperationId}-${childOperationId}`,
        source: parentOperationId,
        target: childOperationId,
        type: 'BUTTON_EDGE',
      });
    },
    updateRunAfter: (
      state: WorkflowState,
      action: PayloadAction<{ childOperation: string; parentOperation: string; statuses: string[] }>
    ) => {
      const childOperation = state.operations[action.payload.childOperation] as LogicAppsV2.ActionDefinition;
      if (!childOperation) {
        return;
      }
      if (!childOperation.runAfter) {
        childOperation.runAfter = {};
      }
      childOperation.runAfter[action.payload.parentOperation] = action.payload.statuses;
    },
    replaceId: (state: WorkflowState, action: PayloadAction<{ originalId: string; newId: string }>) => {
      const { originalId, newId } = action.payload;
      state.idReplacements[originalId] = newId.replaceAll(' ', '_');
    },
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(initializeGraphState.fulfilled, (state, action) => {
      state.graph = action.payload.graph;
      state.operations = action.payload.actionData;
      state.nodesMetadata = action.payload.nodesMetadata;
      state.focusedCanvasNodeId = Object.entries(action?.payload?.actionData ?? {}).find(
        ([, value]) => !(value as LogicAppsV2.ActionDefinition).runAfter
      )?.[0];
    });
  },
});

// Action creators are generated for each case reducer function
export const {
  initWorkflowSpec,
  addNode,
  deleteNode,
  updateNodeSizes,
  setNodeDescription,
  setCollapsedGraphIds,
  toggleCollapsedGraphId,
  discardAllChanges,
  buildEdgeIdsBySource,
  updateRunAfter,
  addEdgeFromRunAfter,
  removeEdgeFromRunAfter,
  clearFocusNode,
  setFocusNode,
  replaceId,
} = workflowSlice.actions;

export default workflowSlice.reducer;
