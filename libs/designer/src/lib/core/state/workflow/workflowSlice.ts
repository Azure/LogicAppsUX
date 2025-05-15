import constants from '../../../common/constants';
import { updateNodeConnection } from '../../actions/bjsworkflow/connections';
import { initializeGraphState } from '../../parsers/ParseReduxAction';
import type { AddNodePayload } from '../../parsers/addNodeToWorkflow';
import { addSwitchCaseToWorkflow, addNodeToWorkflow, addAgentToolToWorkflow } from '../../parsers/addNodeToWorkflow';
import type { DeleteNodePayload } from '../../parsers/deleteNodeFromWorkflow';
import { deleteWorkflowNode, deleteNodeFromWorkflow } from '../../parsers/deleteNodeFromWorkflow';
import type { WorkflowNode } from '../../parsers/models/workflowNode';
import { isWorkflowNode } from '../../parsers/models/workflowNode';
import type { MoveNodePayload } from '../../parsers/moveNodeInWorkflow';
import { moveNodeInWorkflow } from '../../parsers/moveNodeInWorkflow';
import { pasteScopeInWorkflow } from '../../parsers/pasteScopeInWorkflow';
import type { PasteScopeNodePayload } from '../../parsers/pasteScopeInWorkflow';
import { addNewEdge } from '../../parsers/restructuringHelpers';
import { createWorkflowNode, getImmediateSourceNodeIds, transformOperationTitle } from '../../utils/graph';
import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import type { AddSettingsPayload, NodeOperation } from '../operation/operationMetadataSlice';
import {
  updateNodeParameters,
  updateNodeSettings,
  updateParameterConditionalVisibility,
  updateStaticResults,
} from '../operation/operationMetadataSlice';
import type { RelationshipIds } from '../panel/panelTypes';
import type { ErrorMessage, SpecTypes, WorkflowState, WorkflowKind, NodeMetadata } from './workflowInterfaces';
import type { BoundParameters } from '@microsoft/logic-apps-shared';
import { getParentsUncollapseFromGraphState, getWorkflowNodeFromGraphState } from './workflowSelectors';
import {
  LogEntryLevel,
  LoggerService,
  equals,
  getRecordEntry,
  RUN_AFTER_STATUS,
  WORKFLOW_EDGE_TYPES,
  WORKFLOW_NODE_TYPES,
  containsIdTag,
  containsCaseTag,
} from '@microsoft/logic-apps-shared';
import type { MessageLevel } from '@microsoft/designer-ui';
import { getDurationStringPanelMode } from '@microsoft/designer-ui';
import type * as LogicAppsV2 from '@microsoft/logic-apps-shared/src/utils/src/lib/models/logicAppsV2';
import { createSlice, isAnyOf } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { NodeChange, NodeDimensionChange } from '@xyflow/system';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';
import { initializeInputsOutputsBinding } from '../../actions/bjsworkflow/monitoring';
import { updateAgenticSubgraph, type UpdateAgenticGraphPayload } from '../../parsers/updateAgenticGraph';

export interface AddImplicitForeachPayload {
  nodeId: string;
  foreachNodeId: string;
  operation: any;
}

export const initialWorkflowState: WorkflowState = {
  workflowSpec: 'BJS',
  workflowKind: undefined,
  graph: null,
  runInstance: null,
  operations: {},
  nodesMetadata: {},
  collapsedGraphIds: {},
  collapsedActionIds: {},
  edgeIdsBySource: {},
  idReplacements: {},
  newlyAddedOperations: {},
  isDirty: false,
  originalDefinition: {
    $schema: constants.SCHEMA.GA_20160601.URL,
    contentVersion: '1.0.0.0',
  },
  agentsGraph: {},
  hostData: {
    errorMessages: {},
  },
  transitionRepetitionIndex: 0,
  transitionRepetitionArray: [],
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
      const nodeOperation = getRecordEntry(state.operations, nodeId);
      if (!nodeOperation) {
        return;
      }
      nodeOperation.description = description;
    },
    addNode: (state: WorkflowState, action: PayloadAction<AddNodePayload>) => {
      if (!state.graph) {
        return; // log exception
      }
      const graph = getWorkflowNodeFromGraphState(state, action.payload.relationshipIds.graphId);
      if (!graph) {
        throw new Error('graph not set');
      }

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
      const graphId = getRecordEntry(state.nodesMetadata, nodeId)?.graphId ?? '';
      const currentGraph = (graphId === 'root' ? state.graph : getWorkflowNodeFromGraphState(state, graphId)) as WorkflowNode;
      const parentIds = getImmediateSourceNodeIds(currentGraph, nodeId);
      const parentId = parentIds.length > 1 ? undefined : parentIds[0];
      addNodeToWorkflow(
        { nodeId: foreachNodeId, relationshipIds: { graphId, parentId, childId: nodeId }, operation },
        currentGraph,
        state.nodesMetadata,
        state
      );
      state.operations[foreachNodeId] = { ...getRecordEntry(state.operations, foreachNodeId), ...operation };
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
      action: PayloadAction<{ nodeId: string; relationshipIds: RelationshipIds; operation: NodeOperation; isParallelBranch?: boolean }>
    ) => {
      const graph = getWorkflowNodeFromGraphState(state, action.payload.relationshipIds.graphId);
      if (!graph) {
        throw new Error('graph not set');
      }

      addNodeToWorkflow(
        {
          operation: action.payload.operation as any,
          nodeId: action.payload.nodeId,
          relationshipIds: action.payload.relationshipIds,
          isParallelBranch: action.payload.isParallelBranch,
        },
        graph,
        state.nodesMetadata,
        state
      );
    },
    pasteScopeNode: (state: WorkflowState, action: PayloadAction<PasteScopeNodePayload>) => {
      const { relationshipIds, scopeNode, operations, nodesMetadata, allActions, isParallelBranch } = action.payload;
      const graph = getWorkflowNodeFromGraphState(state, relationshipIds.graphId);
      if (!graph) {
        throw new Error('graph not set');
      }
      pasteScopeInWorkflow(scopeNode, graph, relationshipIds, operations, nodesMetadata, allActions, state, isParallelBranch);
    },
    moveNode: (state: WorkflowState, action: PayloadAction<MoveNodePayload>) => {
      if (!state.graph) {
        console.error('graph not set');
        return; // log exception
      }
      const oldGraph = getWorkflowNodeFromGraphState(state, action.payload.oldGraphId);
      if (!oldGraph) {
        throw new Error('graph not set');
      }
      const newGraph = getWorkflowNodeFromGraphState(state, action.payload.newGraphId);
      if (!newGraph) {
        throw new Error('graph not set');
      }
      const currentNode = getWorkflowNodeFromGraphState(state, action.payload.nodeId);
      if (!currentNode) {
        throw new Error('node not set');
      }

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
      const graphId = getRecordEntry(state.nodesMetadata, nodeId)?.graphId ?? '';
      const graph = getWorkflowNodeFromGraphState(state, graphId);
      if (!graph) {
        throw new Error('graph not set');
      }

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
          addNewEdge(state, constants.NODE.TYPE.PLACEHOLDER_TRIGGER, childId, graph);
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
    updateAgenticGraph: (state: WorkflowState, action: PayloadAction<UpdateAgenticGraphPayload>) => {
      if (!state.graph) {
        return; // log exception
      }
      const { nodeId } = action.payload;
      const graph = getWorkflowNodeFromGraphState(state, nodeId);
      if (!graph) {
        throw new Error('graph not set');
      }

      updateAgenticSubgraph(action.payload, graph, state);

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: 'Update node agentic workflow',
        args: [action.payload],
      });
    },
    updateAgenticMetadata: (state: WorkflowState, action: PayloadAction<UpdateAgenticGraphPayload>) => {
      if (!state.graph) {
        return; // log exception
      }
      const { scopeRepetitionRunData, nodeId } = action.payload;
      const { tools = {} } = scopeRepetitionRunData ?? {};
      const agentGraph = getWorkflowNodeFromGraphState(state, nodeId);

      Object.keys(tools).forEach((toolId: any) => {
        const nodeMetadata = getRecordEntry(state.nodesMetadata, toolId);
        if (!nodeMetadata) {
          return;
        }
        const nodeData = {
          ...nodeMetadata,
          runData: {
            status: tools[toolId].status,
            repetitionCount: tools[toolId].iterations,
          },
          runIndex: 0,
        };
        state.nodesMetadata[toolId] = nodeData as NodeMetadata;
      });

      const nodeMetadata = getRecordEntry(state.nodesMetadata, nodeId);
      if (!nodeMetadata) {
        return;
      }
      const nodeRunData = {
        ...nodeMetadata.runData,
        ...scopeRepetitionRunData,
        inputsLink: scopeRepetitionRunData?.inputsLink ?? null,
        outputsLink: scopeRepetitionRunData?.outputsLink ?? null,
        duration: getDurationStringPanelMode(
          Date.parse(scopeRepetitionRunData?.endTime) - Date.parse(scopeRepetitionRunData?.startTime),
          /* abbreviated */ true
        ),
      };
      nodeMetadata.runData = nodeRunData as LogicAppsV2.WorkflowRunAction;
      nodeMetadata.actionCount =
        (agentGraph?.children ?? []).filter((node) => !containsIdTag(node.id) && !containsCaseTag(node.id))?.length ?? -1;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: 'Update agentic metadata',
        args: [action.payload],
      });
    },
    deleteSwitchCase: (state: WorkflowState, action: PayloadAction<{ caseId: string; nodeId: string }>) => {
      delete (getRecordEntry(state.operations, action.payload.nodeId) as any).cases?.[action.payload.caseId];

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
    setFocusElement: (state: WorkflowState, action: PayloadAction<string>) => {
      state.focusElement = action.payload;
    },
    clearFocusElement: (state: WorkflowState) => {
      state.focusElement = undefined;
    },
    clearFocusCollapsedNode: (state: WorkflowState) => {
      state.focusCollapsedNodeId = undefined;
    },
    updateNodeSizes: (state: WorkflowState, action: PayloadAction<NodeChange[]>) => {
      const dimensionChanges = action.payload.filter((x) => x.type === 'dimensions');
      if (!state.graph) {
        return;
      }
      const stack: WorkflowNode[] = [state.graph];

      const dimensionChangesById: Record<string, NodeDimensionChange> = {};
      for (const val of dimensionChanges) {
        if (val.type !== 'dimensions') {
          continue;
        }
        dimensionChangesById[val.id] = val as NodeDimensionChange;
      }

      while (stack.length) {
        const node = stack.shift();
        const change = getRecordEntry(dimensionChangesById, node?.id ?? '');
        if (change && node && isWorkflowNode(node)) {
          const c = change as NodeDimensionChange;
          if ((c.dimensions?.height ?? 0) === 0 || (c.dimensions?.width ?? 0) === 0) {
            continue; // Skip if the dimensions are 0
          }
          if (node.height === c.dimensions?.height && node.width === c.dimensions?.width) {
            continue; // Skip if the dimensions have not changed
          }
          node.height = c.dimensions?.height ?? 0;
          node.width = c.dimensions?.width ?? 0;
        }
        !!node?.children?.length && stack.push(...node.children);
      }
    },
    setCollapsedGraphIds: (state: WorkflowState, action: PayloadAction<string[]>) => {
      const idArray = action.payload;
      const idRecord = idArray.reduce(
        (acc, id) => {
          acc[id] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
      state.collapsedGraphIds = idRecord;
    },
    collapseGraphsToShowNode: (state: WorkflowState, action: PayloadAction<string>) => {
      state.collapsedGraphIds = getParentsUncollapseFromGraphState(state, action.payload);
    },
    setCollapsedGraphId: (state: WorkflowState, action: PayloadAction<{ id: string; isCollapsed: boolean }>) => {
      const { id, isCollapsed } = action.payload;
      if (isCollapsed && state.collapsedGraphIds?.[id] !== true) {
        state.collapsedGraphIds[id] = true;
      } else if (!isCollapsed && state.collapsedGraphIds?.[id] === true) {
        delete state.collapsedGraphIds[id];
      }
    },
    toggleCollapsedGraphId: (state: WorkflowState, action: PayloadAction<{ id: string; includeNested?: boolean }>) => {
      const expanding = getRecordEntry(state.collapsedGraphIds, action.payload.id) === true;
      if (expanding) {
        delete state.collapsedGraphIds[action.payload.id];
      } else {
        state.collapsedGraphIds[action.payload.id] = true;
      }

      // Iterate over all graph children and set them to the same state
      if (action.payload.includeNested) {
        const graph = getWorkflowNodeFromGraphState(state, action.payload.id);
        if (!graph) {
          return;
        }
        const nestedGraphIds: string[] = [];
        const stack: WorkflowNode[] = [graph];
        while (stack.length) {
          const node = stack.shift();
          if (node?.children) {
            for (const child of node.children) {
              if (child.type === WORKFLOW_NODE_TYPES.GRAPH_NODE || child.type === WORKFLOW_NODE_TYPES.SUBGRAPH_NODE) {
                nestedGraphIds.push(child.id);
                stack.push(child);
              }
            }
          }
        }
        for (const id of nestedGraphIds) {
          const collapsed = getRecordEntry(state.collapsedGraphIds, id) === true;
          if (expanding && collapsed) {
            delete state.collapsedGraphIds[id];
          } else if (!expanding && !collapsed) {
            state.collapsedGraphIds[id] = true;
          }
        }
      }

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    toggleCollapsedActionId: (state: WorkflowState, action: PayloadAction<string>) => {
      if (getRecordEntry(state.collapsedActionIds, action.payload) === true) {
        delete state.collapsedActionIds[action.payload];
      } else {
        state.collapsedActionIds[action.payload] = true;
      }
      state.focusCollapsedNodeId = action.payload;

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    setRunIndex: (state: WorkflowState, action: PayloadAction<{ page: number; nodeId: string }>) => {
      const { page, nodeId } = action.payload;
      const nodeMetadata = getRecordEntry(state.nodesMetadata, nodeId);
      if (!nodeMetadata) {
        return;
      }
      nodeMetadata.runIndex = page;
    },
    setRepetitionRunData: (
      state: WorkflowState,
      action: PayloadAction<{ nodeId: string; runData: LogicAppsV2.WorkflowRunAction; isWithinAgentic?: boolean }>
    ) => {
      const { nodeId, runData, isWithinAgentic = false } = action.payload;
      const nodeMetadata = getRecordEntry(state.nodesMetadata, nodeId);
      if (!nodeMetadata) {
        return;
      }
      const nodeRunData = {
        ...(isWithinAgentic ? {} : nodeMetadata.runData),
        ...runData,
        inputsLink: runData?.inputsLink ?? null,
        outputsLink: runData?.outputsLink ?? null,
        duration: getDurationStringPanelMode(Date.parse(runData?.endTime) - Date.parse(runData?.startTime), /* abbreviated */ true),
      };
      nodeMetadata.runData = nodeRunData as LogicAppsV2.WorkflowRunAction;
    },
    clearAllRepetitionRunData: (state: WorkflowState) => {
      for (const node of Object.values(state.nodesMetadata)) {
        if (node.runData) {
          delete node.runData;
        }
      }
    },
    setSubgraphRunData: (state: WorkflowState, action: PayloadAction<{ nodeId: string; runData: LogicAppsV2.RunRepetition[] }>) => {
      const { nodeId, runData } = action.payload;
      const nodeMetadata = getRecordEntry(state.nodesMetadata, nodeId);
      if (!nodeMetadata) {
        return;
      }
      const subgraph = runData.reduce((acc, run) => {
        const nodeId = run.name;
        acc[nodeId] = run.properties;
        return acc;
      }, {} as any);
      nodeMetadata.subgraphRunData = subgraph;
    },
    setRunDataInputOutputs: (
      state: WorkflowState,
      action: PayloadAction<{ nodeId: string; inputs: BoundParameters; outputs: BoundParameters }>
    ) => {
      const { nodeId, inputs, outputs } = action.payload;
      const nodeMetadata = getRecordEntry(state.nodesMetadata, nodeId);
      if (!nodeMetadata) {
        return;
      }
      const nodeRunData = {
        ...nodeMetadata.runData,
        inputs: inputs,
        outputs: outputs,
      };
      nodeMetadata.runData = nodeRunData as LogicAppsV2.WorkflowRunAction;
    },
    addSwitchCase: (state: WorkflowState, action: PayloadAction<{ caseId: string; nodeId: string }>) => {
      if (!state.graph) {
        return; // log exception
      }
      const { caseId, nodeId } = action.payload;
      const graphId = getRecordEntry(state.nodesMetadata, nodeId)?.graphId ?? '';
      const node = getWorkflowNodeFromGraphState(state, graphId);
      if (!node) {
        throw new Error('node not set');
      }
      addSwitchCaseToWorkflow(caseId, node, state.nodesMetadata, state);

      LoggerService().log({
        level: LogEntryLevel.Verbose,
        area: 'Designer:Workflow Slice',
        message: action.type,
        args: [action.payload],
      });
    },
    addAgentTool: (state: WorkflowState, action: PayloadAction<{ toolId: string; nodeId: string }>) => {
      if (!state.graph) {
        return; // log exception
      }
      const { toolId, nodeId } = action.payload;
      const graphId = getRecordEntry(state.nodesMetadata, nodeId)?.graphId ?? '';
      const node = getWorkflowNodeFromGraphState(state, graphId);
      if (!node) {
        throw new Error('node not set');
      }
      addAgentToolToWorkflow(toolId, node, state.nodesMetadata, state);

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
      if (!state.graph) {
        return;
      }

      const output: Record<string, string[]> = {};
      const traverseGraph = (graph: WorkflowNode) => {
        const edges = graph.edges?.filter((e) => e.type !== WORKFLOW_EDGE_TYPES.HIDDEN_EDGE);
        if (edges) {
          edges.forEach((edge) => {
            if (!getRecordEntry(output, edge.source)) {
              output[edge.source] = [];
            }
            getRecordEntry(output, edge.source)?.push(edge.target);
          });
        }
        if (graph.children) {
          graph.children.forEach((child) => traverseGraph(child));
        }
      };
      traverseGraph(state.graph);
      state.edgeIdsBySource = output;
    },
    removeEdgeFromRunAfter: (state: WorkflowState, action: PayloadAction<{ childOperationId: string; parentOperationId: string }>) => {
      const { childOperationId, parentOperationId } = action.payload;
      const parentOperation = getRecordEntry(state.operations, parentOperationId);
      const childOperation: LogicAppsV2.ActionDefinition | undefined = getRecordEntry(state.operations, childOperationId);
      if (!parentOperation || !childOperation) {
        return;
      }
      delete childOperation.runAfter?.[parentOperationId];

      // If there is only the trigger node left, set to empty object
      if (Object.keys(childOperation.runAfter ?? {}).length === 1) {
        const rootTriggerNodeId = Object.entries(state.nodesMetadata).find(
          ([_, node]) => node.graphId === 'root' && node.isRoot === true
        )?.[0];
        if (Object.keys(childOperation.runAfter ?? {})[0] === rootTriggerNodeId) {
          childOperation.runAfter = {};
        }
      }

      const graphPath: string[] = [];
      let operationGraph = getRecordEntry(state.nodesMetadata, childOperationId);

      while (operationGraph && !equals(operationGraph?.graphId, 'root')) {
        graphPath.push(operationGraph.graphId);
        operationGraph = getRecordEntry(state.nodesMetadata, operationGraph?.graphId);
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
    addEdgeToRunAfter: (state: WorkflowState, action: PayloadAction<{ childOperationId: string; parentOperationId: string }>) => {
      const { childOperationId, parentOperationId } = action.payload;
      const parentOperation = getRecordEntry(state.operations, parentOperationId);
      const childOperation: LogicAppsV2.ActionDefinition | undefined = getRecordEntry(state.operations, childOperationId);
      if (!parentOperation || !childOperation) {
        return;
      }

      // If there is no existing run after, it was running after the trigger
      // We need to add a dummy trigger node to populate the settings object and flag validation
      if (Object.keys(childOperation.runAfter ?? {}).length === 0) {
        const rootTriggerNodeId =
          Object.entries(state.nodesMetadata).find(([_, node]) => node.graphId === 'root' && node.isRoot === true)?.[0] ?? '';
        childOperation.runAfter = { [rootTriggerNodeId]: [RUN_AFTER_STATUS.SUCCEEDED] };
      }

      childOperation.runAfter = { ...(childOperation.runAfter ?? {}), [parentOperationId]: [RUN_AFTER_STATUS.SUCCEEDED] };

      const graphPath: string[] = [];
      let operationGraph = getRecordEntry(state.nodesMetadata, childOperationId);

      while (operationGraph && !equals(operationGraph.graphId, 'root')) {
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
    addEdgeToTransitions: (state: WorkflowState, action: PayloadAction<{ sourceId: string; targetId: string; isHandoff?: boolean }>) => {
      const { sourceId, targetId } = action.payload;
      const sourceOperation = getRecordEntry(state.operations, sourceId);
      const targetOperation = getRecordEntry(state.operations, targetId);
      if (!sourceOperation || !targetOperation) {
        return;
      }
      if (!sourceOperation.transitions) {
        sourceOperation.transitions = {};
      }
      if (!targetOperation.transitions) {
        targetOperation.transitions = {};
      }

      const defaultStatus = action.payload.isHandoff ? RUN_AFTER_STATUS.HANDOFF : RUN_AFTER_STATUS.SUCCEEDED;

      sourceOperation.transitions = {
        ...(sourceOperation.transitions ?? {}),
        [targetId]: {
          when: [defaultStatus],
        },
      };

      const graphPath: string[] = [];
      let operationGraph = getRecordEntry(state.nodesMetadata, targetId);

      while (operationGraph && !equals(operationGraph.graphId, 'root')) {
        graphPath.push(operationGraph.graphId);
        operationGraph = state.nodesMetadata[operationGraph.graphId];
      }
      let graph = state.graph;
      for (const id of graphPath.reverse()) {
        graph = graph?.children?.find((x) => x.id === id) ?? null;
      }

      // Don't add the edge if it already exists
      if ((graph?.edges ?? []).some((x) => x.source === sourceId && x.target === targetId)) {
        return;
      }

      graph?.edges?.push({
        id: `${sourceId}-${targetId}`,
        source: sourceId,
        target: targetId,
        type: 'TRANSITION_EDGE',
      });
    },
    removeEdgeFromTransitions: (state: WorkflowState, action: PayloadAction<{ sourceId: string; targetId: string }>) => {
      const { sourceId, targetId } = action.payload;
      const sourceOperation = getRecordEntry(state.operations, sourceId);
      const targetOperation = getRecordEntry(state.operations, targetId);
      if (!sourceOperation || !targetOperation) {
        return;
      }

      delete sourceOperation.transitions?.[targetId];
      if (Object.keys(sourceOperation.transitions ?? {}).length === 0) {
        delete sourceOperation.transitions;
      }

      const graphPath: string[] = [];
      let operationGraph = getRecordEntry(state.nodesMetadata, targetId);

      while (operationGraph && !equals(operationGraph?.graphId, 'root')) {
        graphPath.push(operationGraph.graphId);
        operationGraph = getRecordEntry(state.nodesMetadata, operationGraph?.graphId);
      }
      let graph = state.graph;
      for (const id of graphPath.reverse()) {
        graph = graph?.children?.find((x) => x.id === id) ?? null;
      }
      if (!graph) {
        return;
      }
      graph.edges = graph.edges?.filter((x) => x.source !== sourceId || x.target !== targetId) ?? [];
    },
    setTransitionRepetitionIndex: (state: WorkflowState, action: PayloadAction<number>) => {
      state.transitionRepetitionIndex = action.payload;
    },
    setTransitionRepetitionArray: (state: WorkflowState, action: PayloadAction<string[][]>) => {
      state.transitionRepetitionArray = action.payload;
    },
    updateRunAfter: (
      state: WorkflowState,
      action: PayloadAction<{ childOperation: string; parentOperation: string; statuses: string[] }>
    ) => {
      const childOperation = getRecordEntry(state.operations, action.payload.childOperation) as LogicAppsV2.ActionDefinition;
      if (!childOperation) {
        return;
      }
      if (!childOperation.runAfter) {
        childOperation.runAfter = {};
      }
      childOperation.runAfter[action.payload.parentOperation] = action.payload.statuses;
    },
    updateTransitions: (
      state: WorkflowState,
      action: PayloadAction<{ sourceId: string; targetId: string; transition: LogicAppsV2.Transition | undefined }>
    ) => {
      const { sourceId, targetId, transition } = action.payload;
      const nodeOperation = getRecordEntry(state.operations, sourceId);
      if (!nodeOperation) {
        return;
      }
      if (transition) {
        if (!nodeOperation.transitions) {
          nodeOperation.transitions = {};
        }
        nodeOperation.transitions[targetId] = transition;
      } else if (nodeOperation.transitions) {
        delete nodeOperation.transitions[targetId];
        if (Object.keys(nodeOperation.transitions).length === 0) {
          delete nodeOperation.transitions;
        }
      }
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
    setHostErrorMessages: (state, action: PayloadAction<{ level: MessageLevel; errorMessages: ErrorMessage[] | undefined }>) => {
      if (!action.payload.errorMessages) {
        delete state.hostData.errorMessages[action.payload.level];
        return;
      }
      state.hostData.errorMessages[action.payload.level] = action.payload.errorMessages;
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
    });
    builder.addCase(updateNodeParameters, (state, action) => {
      state.isDirty = state.isDirty || action.payload.isUserAction || false;
    });
    builder.addCase(resetWorkflowState, () => initialWorkflowState);
    builder.addCase(initializeInputsOutputsBinding.fulfilled, (state, action) => {
      const { nodeId, inputs, outputs } = action.payload;
      const nodeMetadata = getRecordEntry(state.nodesMetadata, nodeId);
      if (!nodeMetadata) {
        return;
      }
      const nodeRunData = {
        ...nodeMetadata.runData,
        inputs: inputs,
        outputs: outputs,
      };
      nodeMetadata.runData = nodeRunData as LogicAppsV2.WorkflowRunAction;
    });
    builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.workflow);
    builder.addCase(updateNodeSettings, (state, action: PayloadAction<AddSettingsPayload>) => {
      const { ignoreDirty = false } = action.payload;
      if (!ignoreDirty) {
        state.isDirty = true;
      }
    });
    builder.addMatcher(
      isAnyOf(
        addNode,
        moveNode,
        deleteNode,
        addSwitchCase,
        deleteSwitchCase,
        addAgentTool,
        addImplicitForeachNode,
        pasteScopeNode,
        setNodeDescription,
        updateRunAfter,
        removeEdgeFromRunAfter,
        addEdgeToRunAfter,
        replaceId,
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
  pasteScopeNode,
  moveNode,
  deleteNode,
  deleteSwitchCase,
  updateNodeSizes,
  setNodeDescription,
  setCollapsedGraphId,
  toggleCollapsedGraphId,
  addSwitchCase,
  addAgentTool,
  discardAllChanges,
  buildEdgeIdsBySource,
  updateRunAfter,
  updateTransitions,
  addEdgeToRunAfter,
  removeEdgeFromRunAfter,
  addEdgeToTransitions,
  removeEdgeFromTransitions,
  setTransitionRepetitionIndex,
  setTransitionRepetitionArray,
  clearFocusNode,
  setFocusNode,
  setCollapsedGraphIds,
  collapseGraphsToShowNode,
  replaceId,
  setRunIndex,
  setRepetitionRunData,
  clearAllRepetitionRunData,
  setSubgraphRunData,
  setIsWorkflowDirty,
  setHostErrorMessages,
  setRunDataInputOutputs,
  toggleCollapsedActionId,
  clearFocusCollapsedNode,
  updateAgenticGraph,
  updateAgenticMetadata,
  setFocusElement,
  clearFocusElement,
} = workflowSlice.actions;

export default workflowSlice.reducer;
