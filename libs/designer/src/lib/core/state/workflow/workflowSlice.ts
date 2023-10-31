import constants from '../../../common/constants';
import { updateNodeConnection } from '../../actions/bjsworkflow/connections';
import { initializeGraphState } from '../../parsers/ParseReduxAction';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import { addSwitchCaseToWorkflow, addNodeToWorkflow } from '../../parsers/addNodeToWorkflow';
import type { DeleteNodePayload } from '../../parsers/deleteNodeFromWorkflow';
import { deleteWorkflowNode, deleteNodeFromWorkflow } from '../../parsers/deleteNodeFromWorkflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { isWorkflowNode } from '../../parsers/models/workflowNode';
import type { MoveNodePayload } from '../../parsers/moveNodeInWorkflow';
import { moveNodeInWorkflow } from '../../parsers/moveNodeInWorkflow';
import { addNewEdge } from '../../parsers/restructuringHelpers';
import { createWorkflowNode, getImmediateSourceNodeIds, transformOperationTitle } from '../../utils/graph';
import { resetWorkflowState } from '../global';
import type { NodeOperation } from '../operation/operationMetadataSlice';
import {
  updateNodeParameters,
  updateNodeSettings,
  updateParameterConditionalVisibility,
  updateStaticResults,
} from '../operation/operationMetadataSlice';
import type { RelationshipIds } from '../panel/panelInterfaces';
import type { SpecTypes, WorkflowState } from './workflowInterfaces';
import { WorkflowKind } from './workflowInterfaces';
import { getWorkflowNodeFromGraphState } from './workflowSelectors';
import { LogEntryLevel, LoggerService } from '@microsoft/designer-client-services-logic-apps';
import { getDurationStringPanelMode } from '@microsoft/designer-ui';
import type { LogicAppsV2 } from '@microsoft/utils-logic-apps';
import { equals, RUN_AFTER_STATUS, WORKFLOW_EDGE_TYPES, WORKFLOW_NODE_TYPES } from '@microsoft/utils-logic-apps';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { NodeChange, NodeDimensionChange } from 'reactflow';

export interface AddImplicitForeachPayload {
  nodeId: string;
  foreachNodeId: string;
  operation: any;
}

export const initialWorkflowState: WorkflowState = {
  workflowSpec: 'BJS',
  workflowKind: WorkflowKind.STATELESS,
  graph: null,
  runInstance: null,
  operations: {},
  nodesMetadata: {},
  collapsedGraphIds: {},
  edgeIdsBySource: {},
  idReplacements: {},
  newlyAddedOperations: {},
  isDirty: false,
  originalDefinition: {
    $schema: constants.SCHEMA.GA_20160601.URL,
    contentVersion: '1.0.0.0',
  },
};

export const workflowSlice = createSlice({
  name: 'workflow',
  initialState: initialWorkflowState,
  reducers: {
    initWorkflowSpec: (state: WorkflowState, action: PayloadAction<SpecTypes>) => {
      state.workflowSpec = action.payload;
    },
    initWorkflowKind: (state: WorkflowState, action: PayloadAction<WorkflowKind>) => {
      state.workflowKind = action.payload;
    },
    initRunInstance: (state: WorkflowState, action: PayloadAction<LogicAppsV2.RunInstanceDefinition | null>) => {
      state.runInstance = action.payload;
    },
    setNodeDescription: (state: WorkflowState, action: PayloadAction<{ nodeId: string; description?: string }>) => {
      const { nodeId, description } = action.payload;
      state.operations[nodeId].description = description;
    },
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => {
      if (!state.graph) {
        return; // log exception
      }
      const graph = getWorkflowNodeFromGraphState(state, action.payload.relationshipIds.graphId);
      if (!graph) throw new Error('graph not set');

      if (action.payload.isTrigger) {
        deleteWorkflowNode(constants.NODE.TYPE.PLACEHOLDER_TRIGGER, graph);
        delete state.nodesMetadata[constants.NODE.TYPE.PLACEHOLDER_TRIGGER];
        delete state.operations[constants.NODE.TYPE.PLACEHOLDER_TRIGGER];

        if (graph.edges?.length) {
          graph.edges = graph.edges.map((edge) => {
            if (equals(edge.source, constants.NODE.TYPE.PLACEHOLDER_TRIGGER)) {
              // eslint-disable-next-line no-param-reassign
              edge.source = action.payload.nodeId;
            }
            return edge;
          });
        }
      }

      addNodeToWorkflow(action.payload, graph, state.nodesMetadata, state);

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: 'New Action Node Added',
        args: [action.payload],
      });
    },
    addImplicitForeachNode: (state: WorkflowState, action: PayloadAction<AddImplicitForeachPayload>) => {
      const { nodeId, foreachNodeId, operation } = action.payload;
      const currentNodeToBeReplaced = getWorkflowNodeFromGraphState(state, nodeId) as WorkflowNode;
      const graphId = state.nodesMetadata[nodeId].graphId;
      const currentGraph = (graphId === 'root' ? state.graph : getWorkflowNodeFromGraphState(state, graphId)) as WorkflowNode;
      const parentId = getImmediateSourceNodeIds(currentGraph, nodeId)[0];
      addNodeToWorkflow(
        { nodeId: foreachNodeId, relationshipIds: { graphId, parentId, childId: nodeId }, operation },
        currentGraph,
        state.nodesMetadata,
        state
      );
      state.operations[foreachNodeId] = { ...state.operations[foreachNodeId], ...operation };
      const foreachNode = getWorkflowNodeFromGraphState(state, foreachNodeId) as WorkflowNode;
      moveNodeInWorkflow(
        currentNodeToBeReplaced,
        currentGraph,
        foreachNode,
        { graphId: foreachNode?.id, parentId: foreachNode.children?.[0].id },
        state.nodesMetadata,
        state
      );
    },
    pasteNode: (
      state: WorkflowState,
      action: PayloadAction<{ nodeId: string; relationshipIds: RelationshipIds; operation: NodeOperation }>
    ) => {
      const graph = getWorkflowNodeFromGraphState(state, action.payload.relationshipIds.graphId);
      if (!graph) throw new Error('graph not set');

      addNodeToWorkflow(
        {
          operation: action.payload.operation as any,
          nodeId: action.payload.nodeId,
          relationshipIds: action.payload.relationshipIds,
        },
        graph,
        state.nodesMetadata,
        state
      );
    },
    moveNode: (state: WorkflowState, action: PayloadAction<MoveNodePayload>) => {
      if (!state.graph) {
        console.error('graph not set');
        return; // log exception
      }
      const oldGraph = getWorkflowNodeFromGraphState(state, action.payload.oldGraphId);
      if (!oldGraph) throw new Error('graph not set');
      const newGraph = getWorkflowNodeFromGraphState(state, action.payload.newGraphId);
      if (!newGraph) throw new Error('graph not set');
      const currentNode = getWorkflowNodeFromGraphState(state, action.payload.nodeId);
      if (!currentNode) throw new Error('node not set');

      moveNodeInWorkflow(currentNode, oldGraph, newGraph, action.payload.relationshipIds, state.nodesMetadata, state);

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    deleteNode: (state: WorkflowState, action: PayloadAction<DeleteNodePayload>) => {
      if (!state.graph) {
        return; // log exception
      }
      const { nodeId, isTrigger } = action.payload;
      const graphId = state.nodesMetadata[nodeId]?.graphId;
      const graph = getWorkflowNodeFromGraphState(state, graphId);
      if (!graph) throw new Error('graph not set');

      if (isTrigger) {
        const placeholderNode = {
          id: constants.NODE.TYPE.PLACEHOLDER_TRIGGER,
          width: 200,
          height: 44,
          type: WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE,
        };
        const existingChildren = graph.edges?.filter((edge) => equals(edge.source, nodeId)).map((edge) => edge.target) ?? [];

        deleteNodeFromWorkflow(action.payload, graph, state.nodesMetadata, state);

        graph.children = [...(graph?.children ?? []), placeholderNode];
        state.nodesMetadata[constants.NODE.TYPE.PLACEHOLDER_TRIGGER] = { graphId, isRoot: true };
        state.operations[constants.NODE.TYPE.PLACEHOLDER_TRIGGER] = createWorkflowNode(
          constants.NODE.TYPE.PLACEHOLDER_TRIGGER,
          WORKFLOW_NODE_TYPES.PLACEHOLDER_NODE
        );
        for (const childId of existingChildren) {
          addNewEdge(state, constants.NODE.TYPE.PLACEHOLDER_TRIGGER, childId, graph, false);
        }
      } else {
        deleteNodeFromWorkflow(action.payload, graph, state.nodesMetadata, state);
      }

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: 'Action Node Deleted',
        args: [action.payload],
      });
    },
    deleteSwitchCase: (state: WorkflowState, action: PayloadAction<{ caseId: string; nodeId: string }>) => {
      delete (state.operations?.[action.payload.nodeId] as any).cases?.[action.payload.caseId];

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: action.type,
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
          node.height = c.dimensions?.height ?? 0;
          node.width = c.dimensions?.width ?? 0;
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

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    setRunIndex: (state: WorkflowState, action: PayloadAction<{ page: number; nodeId: string }>) => {
      const { page, nodeId } = action.payload;
      state.nodesMetadata[nodeId].runIndex = page;
    },
    setRepetitionRunData: (state: WorkflowState, action: PayloadAction<{ nodeId: string; runData: LogicAppsV2.WorkflowRunAction }>) => {
      const { nodeId, runData } = action.payload;
      const nodeRunData = {
        ...state.nodesMetadata[nodeId].runData,
        ...runData,
        inputsLink: runData?.inputsLink ?? null,
        outputsLink: runData?.outputsLink ?? null,
        duration: getDurationStringPanelMode(Date.parse(runData.endTime) - Date.parse(runData.startTime), /* abbreviated */ true),
      };
      state.nodesMetadata[nodeId].runData = nodeRunData as LogicAppsV2.WorkflowRunAction;
    },
    addSwitchCase: (state: WorkflowState, action: PayloadAction<{ caseId: string; nodeId: string }>) => {
      if (!state.graph) {
        return; // log exception
      }
      const { caseId, nodeId } = action.payload;
      const node = getWorkflowNodeFromGraphState(state, state.nodesMetadata[nodeId].graphId);
      if (!node) throw new Error('node not set');
      addSwitchCaseToWorkflow(caseId, node, state.nodesMetadata, state);

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: action.type,
        args: [action.payload],
      });
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
      const normalizedId = transformOperationTitle(newId);
      if (originalId === normalizedId) {
        delete state.idReplacements[originalId];
      } else {
        state.idReplacements[originalId] = normalizedId;
      }
    },
    setIsWorkflowDirty: (state: WorkflowState, action: PayloadAction<boolean>) => {
      state.isDirty = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Add reducers for additional action types here, and handle loading state as needed
    builder.addCase(initializeGraphState.fulfilled, (state, action) => {
      const { deserializedWorkflow, originalDefinition } = action.payload;
      state.originalDefinition = originalDefinition;
      state.graph = deserializedWorkflow.graph;
      state.operations = deserializedWorkflow.actionData;
      state.nodesMetadata = deserializedWorkflow.nodesMetadata;
      state.focusedCanvasNodeId = Object.entries(deserializedWorkflow?.actionData ?? {}).find(
        ([, value]) => !(value as LogicAppsV2.ActionDefinition).runAfter
      )?.[0];
    });
    builder.addCase(updateNodeParameters, (state, action) => {
      state.isDirty = state.isDirty || action.payload.isUserAction || false;
    });
    builder.addCase(resetWorkflowState, () => initialWorkflowState);
    builder.addMatcher(
      isAnyOf(
        addNode,
        moveNode,
        deleteNode,
        addSwitchCase,
        deleteSwitchCase,
        addSwitchCase,
        addImplicitForeachNode,
        setNodeDescription,
        updateRunAfter,
        removeEdgeFromRunAfter,
        addEdgeFromRunAfter,
        replaceId,
        updateNodeSettings,
        updateNodeConnection.fulfilled,
        updateStaticResults,
        updateParameterConditionalVisibility
      ),
      (state) => {
        state.isDirty = true;
      }
    );
  },
});

// Action creators are generated for each case reducer function
export const {
  initWorkflowSpec,
  initWorkflowKind,
  initRunInstance,
  addNode,
  addImplicitForeachNode,
  pasteNode,
  moveNode,
  deleteNode,
  deleteSwitchCase,
  updateNodeSizes,
  setNodeDescription,
  setCollapsedGraphIds,
  toggleCollapsedGraphId,
  addSwitchCase,
  discardAllChanges,
  buildEdgeIdsBySource,
  updateRunAfter,
  addEdgeFromRunAfter,
  removeEdgeFromRunAfter,
  clearFocusNode,
  setFocusNode,
  replaceId,
  setRunIndex,
  setRepetitionRunData,
  setIsWorkflowDirty,
} = workflowSlice.actions;

export default workflowSlice.reducer;
