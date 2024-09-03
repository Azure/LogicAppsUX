import type { ConnectionDictionary, InputConnection } from '../../models/Connection';
import { directAccessPseudoFunctionKey, type FunctionData, type FunctionDictionary } from '../../models/Function';
import {
  applyConnectionValue,
  createConnectionEntryIfNeeded,
  flattenInputs,
  generateInputHandleId,
  getActiveNodes,
  getConnectedSourceSchemaNodes,
  getConnectedTargetSchemaNodes,
  isConnectionUnit,
} from '../../utils/Connection.Utils';
import type { UnknownNode } from '../../utils/DataMap.Utils';
import { addParentConnectionForRepeatingElementsNested, getParentId, isIdForFunctionNode } from '../../utils/DataMap.Utils';
import { createFunctionDictionary, isFunctionData } from '../../utils/Function.Utils';
import { LogService } from '../../utils/Logging.Utils';
import {
  flattenSchemaIntoDictionary,
  flattenSchemaNode,
  isSchemaNodeExtended,
  flattenSchemaIntoSortArray,
  type NodeScrollDirection,
  getNodeIdForScroll,
  getNodesForScroll,
} from '../../utils/Schema.Utils';
import type {
  FunctionMetadata,
  MapMetadataV2,
  SchemaExtended,
  SchemaNodeDictionary,
  SchemaNodeExtended,
} from '@microsoft/logic-apps-shared';
import { emptyCanvasRect, SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { convertConnectionShorthandToId, generateFunctionConnectionMetadata } from '../../mapHandling/MapMetadataSerializer';
import type { Node, Rect, XYPosition } from '@xyflow/react';
import {
  addSourceReactFlowPrefix,
  addTargetReactFlowPrefix,
  convertWholeDataMapToLayoutTree,
  createReactFlowFunctionKey,
  getTreeNodeId,
  isSourceNode,
  isTargetNode,
} from '../../utils/ReactFlow.Util';
import { UnboundedInput } from '../../constants/FunctionConstants';
import { createEdgeId, createTemporaryEdgeId, splitEdgeId } from '../../utils/Edge.Utils';

export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  sourceInEditState: boolean;
  targetInEditState: boolean;
  sourceNodeConnectionBeingDrawnFromId?: string;
  lastAction: string;
}

interface HoverState {
  id: string;
  type: 'node' | 'edge' | 'function';
  isSourceSchema?: boolean;
}

interface ComponentState {
  hover?: HoverState;
}

export interface DataMapOperationState {
  dataMapConnections: ConnectionDictionary;
  dataMapLML: string;
  sourceSchema?: SchemaExtended;
  flattenedSourceSchema: SchemaNodeDictionary;
  targetSchema?: SchemaExtended;
  flattenedTargetSchema: SchemaNodeDictionary;
  targetSchemaOrdering: string[];
  functionNodes: FunctionDictionary;
  selectedItemKey?: string;
  selectedItemConnectedNodes: Record<string, string>; // not really using the second string yet...
  xsltFilename: string;
  xsltContent: string;
  inlineFunctionInputOutputKeys: string[];
  loadedMapMetadata?: MapMetadataV2;
  // Store edge mapping for each edge in the schema to use when the scrolling is happening
  intermediateEdgeMappingForScrolling: Record<string, Record<string, boolean>>;
  // Store edge mapping for each edge in the schema to use when collapsing/expanding
  intermediateEdgeMappingForCollapsing: Record<string, Record<string, boolean>>;
  // Store edge mapping direction for each edge in the schema to use when the scrolling is happening
  // And node is hidden
  intermediateEdgeMappingDirectionForScrolling: Record<string, string>;
  // Generic reactflow node mapping for each node in the scehma
  sourceNodesMap: Record<string, Node>;
  targetNodesMap: Record<string, Node>;
  // Track open nodes in the scehma Tree
  sourceOpenKeys: Record<string, boolean>;
  targetOpenKeys: Record<string, boolean>;
  // Mapping used to store which connection is a loop
  edgeLoopMapping: Record<string, boolean>;
  // Temporary Nodes for when the scrolling is happening and the tree-nodes are not in view
  // For each corner of the canvas
  nodesForScroll: Record<string, Node>;
  edgePopOverId?: string;
  state?: ComponentState;
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  dataMapLML: '',
  functionNodes: {},
  flattenedSourceSchema: {},
  flattenedTargetSchema: {},
  targetSchemaOrdering: [],
  xsltFilename: '',
  xsltContent: '',
  inlineFunctionInputOutputKeys: [],
  selectedItemConnectedNodes: {},
  sourceNodesMap: {},
  targetNodesMap: {},
  sourceOpenKeys: {},
  targetOpenKeys: {},
  edgeLoopMapping: {},
  intermediateEdgeMappingForScrolling: {},
  nodesForScroll: {},
  intermediateEdgeMappingDirectionForScrolling: {},
  intermediateEdgeMappingForCollapsing: {},
};

const initialState: DataMapState = {
  pristineDataMap: emptyPristineState,
  curDataMapOperation: emptyPristineState,
  isDirty: false,
  lastAction: 'InitialState',
  sourceInEditState: true,
  targetInEditState: true,
};

export interface InitialSchemaAction {
  schema: SchemaExtended;
  schemaType: typeof SchemaType.Source | typeof SchemaType.Target;
}

export interface InitialDataMapAction {
  sourceSchema: SchemaExtended;
  targetSchema: SchemaExtended;
  dataMapConnections: ConnectionDictionary;
  metadata: MapMetadataV2 | undefined;
}

export interface ReactFlowNodeAction {
  isSource: boolean;
  id: string;
  node?: Node;
  removeNode?: boolean;
}

export interface ConnectionAction {
  reactFlowSource: string;
  reactFlowDestination: string;
  specificInput?: number;
}

export interface SetConnectionInputAction {
  targetNode: SchemaNodeExtended | FunctionData;
  targetNodeReactFlowKey: string;
  inputIndex?: number;
  input: InputConnection | null; // null is indicator to remove an unbounded input value
  findInputSlot?: boolean;
  isRepeating?: boolean;
}

export interface ExpandCollapseAction {
  isSourceSchema: boolean;
  keys: string[];
  isExpanded: boolean;
}

export interface DeleteConnectionAction {
  connectionKey: string;
  inputKey: string;
}

type ReactFlowNodesUpdateProps = {
  isSource: boolean;
  nodes: Record<string, Node>;
};

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    setXsltFilename: (state, action: PayloadAction<string>) => {
      state.curDataMapOperation.xsltFilename = action.payload;
      state.pristineDataMap.xsltFilename = action.payload;
    },

    setXsltContent: (state, action: PayloadAction<string>) => {
      state.curDataMapOperation.xsltContent = action.payload;
      state.pristineDataMap.xsltContent = action.payload;
    },

    setInitialSchema: (state, action: PayloadAction<InitialSchemaAction>) => {
      const flattenedSchema = flattenSchemaIntoDictionary(action.payload.schema, action.payload.schemaType);
      const currentState = state.curDataMapOperation;

      if (action.payload.schemaType === SchemaType.Source) {
        const flattenedSourceSchema = flattenSchemaNode(action.payload.schema.schemaTreeRoot);

        currentState.sourceSchema = action.payload.schema;
        currentState.sourceOpenKeys = flattenedSourceSchema
          .filter((node) => node.children.length > 0)
          .reduce((acc: Record<string, boolean>, node: SchemaNodeExtended) => {
            acc[node.key] = true;
            return acc;
          }, {});
        currentState.flattenedSourceSchema = flattenedSchema;
        state.pristineDataMap.sourceSchema = action.payload.schema;
        state.pristineDataMap.flattenedSourceSchema = flattenedSchema;

        // NOTE: Reset ReactFlow nodes to filter out source nodes
        currentState.sourceNodesMap = {};
        state.sourceInEditState = false;
        state.lastAction = 'Set initial Source schema';
      } else {
        const flattenedTargetSchema = flattenSchemaNode(action.payload.schema.schemaTreeRoot);
        const targetSchemaSortArray = flattenedTargetSchema.map((node) => node.key);
        currentState.targetSchema = action.payload.schema;
        currentState.targetOpenKeys = flattenedTargetSchema
          .filter((node) => node.children.length > 0)
          .reduce((acc: Record<string, boolean>, node: SchemaNodeExtended) => {
            acc[node.key] = true;
            return acc;
          }, {});
        currentState.flattenedTargetSchema = flattenedSchema;
        currentState.targetSchemaOrdering = targetSchemaSortArray;
        state.pristineDataMap.targetSchema = action.payload.schema;
        state.pristineDataMap.flattenedTargetSchema = flattenedSchema;
        state.pristineDataMap.targetSchemaOrdering = targetSchemaSortArray;

        // NOTE: Reset ReactFlow nodes to filter out source nodes
        currentState.targetNodesMap = {};
        state.targetInEditState = false;
        state.lastAction = 'Set initial Target schema';
      }

      state.curDataMapOperation = { ...currentState };
    },

    setInitialDataMap: (state, action: PayloadAction<InitialDataMapAction>) => {
      const { sourceSchema, targetSchema, dataMapConnections, metadata } = action.payload;
      const currentState = state.curDataMapOperation;
      const flattenedSourceSchema = flattenSchemaIntoDictionary(sourceSchema, SchemaType.Source);
      const flattenedTargetSchema = flattenSchemaIntoDictionary(targetSchema, SchemaType.Target);
      const targetSchemaSortArray = flattenSchemaIntoSortArray(targetSchema.schemaTreeRoot);

      const functionNodes: FunctionDictionary = createFunctionDictionary(dataMapConnections, flattenedTargetSchema);

      assignFunctionNodePositionsFromMetadata(dataMapConnections, metadata?.functionNodes ?? [], functionNodes);

      const newState: DataMapOperationState = {
        ...currentState,
        sourceSchema,
        targetSchema,
        flattenedSourceSchema,
        flattenedTargetSchema,
        functionNodes,
        targetSchemaOrdering: targetSchemaSortArray,
        dataMapConnections: dataMapConnections ?? {},
        loadedMapMetadata: metadata,
        nodesForScroll: getNodesForScroll(),
        intermediateEdgeMappingForCollapsing: {},
        intermediateEdgeMappingForScrolling: {},
        intermediateEdgeMappingDirectionForScrolling: {},
      };

      state.curDataMapOperation = newState;
      state.isDirty = false;
      state.sourceInEditState = false;
      state.targetInEditState = false;
      state.pristineDataMap = newState;
      state.lastAction = 'Set initial data map';

      // Todo: Add connections to edge-mapping for already loaded connections after the initial map has been created
      const layout = convertWholeDataMapToLayoutTree(flattenedSourceSchema, flattenedTargetSchema, functionNodes, dataMapConnections);
      const newStateOperationsForIntermediateState = {
        ...state.curDataMapOperation,
        intermediateEdgeMappingForScrolling: {
          ...state.curDataMapOperation.intermediateEdgeMappingForScrolling,
        },
        intermediateEdgeMappingForCollapsing: {
          ...state.curDataMapOperation.intermediateEdgeMappingForCollapsing,
        },
      };

      for (const edge of layout.edges) {
        const { sourceId, targetId } = edge;
        addIntermediateConnections(sourceId, targetId, newStateOperationsForIntermediateState);
      }

      state.curDataMapOperation = {
        ...newStateOperationsForIntermediateState,
      };
    },
    createInputSlotForUnboundedInput: (state, action: PayloadAction<string>) => {
      const newState: DataMapState = {
        ...state,
        curDataMapOperation: {
          ...state.curDataMapOperation,
          dataMapConnections: {
            ...state.curDataMapOperation.dataMapConnections,
          },
        },
      };
      newState.curDataMapOperation.dataMapConnections[action.payload].inputs[0].push(undefined);

      doDataMapOperation(state, newState, 'Set connection input value');
    },
    setConnectionInput: (state, action: PayloadAction<SetConnectionInputAction>) => {
      const newState: DataMapState = {
        ...state,
        curDataMapOperation: {
          ...state.curDataMapOperation,
          dataMapConnections: {
            ...state.curDataMapOperation.dataMapConnections,
          },
        },
      };

      applyConnectionValue(newState.curDataMapOperation.dataMapConnections, action.payload);

      newState.curDataMapOperation.selectedItemConnectedNodes = getActiveNodes(
        newState.curDataMapOperation,
        state.curDataMapOperation.selectedItemKey
      );

      doDataMapOperation(state, newState, 'Set connection input value');
    },
    makeConnectionFromMap: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapState = {
        ...state,
        curDataMapOperation: {
          ...state.curDataMapOperation,
          dataMapConnections: {
            ...state.curDataMapOperation.dataMapConnections,
          },
          functionNodes: { ...state.curDataMapOperation.functionNodes },
        },
      };

      const { reactFlowSource, reactFlowDestination } = action.payload;
      const isSourceNodeFromSchema = isSourceNode(reactFlowSource);
      const isTargetNodeFromSchema = isTargetNode(reactFlowDestination);
      const sourceNode: UnknownNode = isSourceNodeFromSchema
        ? state.curDataMapOperation.flattenedSourceSchema[reactFlowSource]
        : newState.curDataMapOperation.functionNodes[reactFlowSource];
      const destinationNode: UnknownNode = isTargetNodeFromSchema
        ? state.curDataMapOperation.flattenedTargetSchema[reactFlowDestination]
        : newState.curDataMapOperation.functionNodes[action.payload.reactFlowDestination];

      // Add any repeating parent nodes as well (except for Direct Access's)
      // Get all the source nodes in case we have sources from multiple source chains
      const originalSourceNodeId = action.payload.reactFlowSource;
      let schemaSources: SchemaNodeExtended[];

      if (!(isIdForFunctionNode(originalSourceNodeId) && originalSourceNodeId === directAccessPseudoFunctionKey)) {
        if (isIdForFunctionNode(originalSourceNodeId)) {
          const sourceNodes = getConnectedSourceSchemaNodes(
            [newState.curDataMapOperation.dataMapConnections[action.payload.reactFlowSource]],
            newState.curDataMapOperation.dataMapConnections
          );
          schemaSources = sourceNodes;
        } else {
          schemaSources = [state.curDataMapOperation.flattenedSourceSchema[originalSourceNodeId]];
        }

        // We'll only have one output node in this case
        const originalTargetNodeId = action.payload.reactFlowDestination;
        let actualTarget: SchemaNodeExtended[];
        if (isIdForFunctionNode(originalTargetNodeId)) {
          const targetNodes = getConnectedTargetSchemaNodes(
            [newState.curDataMapOperation.dataMapConnections[action.payload.reactFlowDestination]],
            newState.curDataMapOperation.dataMapConnections
          );
          actualTarget = targetNodes;
        } else {
          actualTarget = [state.curDataMapOperation.flattenedTargetSchema[originalTargetNodeId]];
        }

        schemaSources.forEach((sourceNode) => {
          if (actualTarget.length > 0) {
            addParentConnectionForRepeatingElementsNested(
              sourceNode,
              actualTarget[0],
              newState.curDataMapOperation.flattenedSourceSchema,
              newState.curDataMapOperation.flattenedTargetSchema,
              newState.curDataMapOperation.dataMapConnections
            );
          }
        });
      }

      if (!isTargetNodeFromSchema && (destinationNode as any)?.maxNumberOfInputs === UnboundedInput) {
        action.payload.specificInput = 0;
      }

      addConnection(newState.curDataMapOperation.dataMapConnections, action.payload, destinationNode, sourceNode);

      newState.curDataMapOperation.selectedItemConnectedNodes = getActiveNodes(
        newState.curDataMapOperation,
        state.curDataMapOperation.selectedItemKey
      );

      if (isFunctionData(sourceNode)) {
        doDataMapOperation(state, newState, 'Updated function node locations by adding');
      }

      handleDirectAccessConnection(sourceNode, action.payload, newState.curDataMapOperation, destinationNode);

      doDataMapOperation(state, newState, 'Make connection');

      // Add both collapsable and intermediate connections behind the scenes after the edge has been created
      const newStateOperationsForIntermediateState = {
        ...state.curDataMapOperation,
        intermediateEdgeMappingForScrolling: {
          ...state.curDataMapOperation.intermediateEdgeMappingForScrolling,
        },
        intermediateEdgeMappingForCollapsing: {
          ...state.curDataMapOperation.intermediateEdgeMappingForCollapsing,
        },
      };

      addIntermediateConnections(reactFlowSource, reactFlowDestination, newStateOperationsForIntermediateState);

      state.curDataMapOperation = { ...newStateOperationsForIntermediateState };
    },
    updateDataMapLML: (state, action: PayloadAction<string>) => {
      state.curDataMapOperation.dataMapLML = action.payload;
    },
    addFunctionNode: (state, action: PayloadAction<FunctionData | { functionData: FunctionData; newReactFlowKey: string }>) => {
      const newState: DataMapState = {
        ...state,
        curDataMapOperation: {
          ...state.curDataMapOperation,
          functionNodes: { ...state.curDataMapOperation.functionNodes },
        },
      };

      let fnReactFlowKey: string;
      let fnData: FunctionData;

      // Default - just provide the FunctionData and the key will be handled under the hood
      if ('newReactFlowKey' in action.payload) {
        // Alternative - specify the key you want to use (needed for adding inline Functions)
        fnData = action.payload.functionData;
        fnReactFlowKey = action.payload.newReactFlowKey;
        newState.curDataMapOperation.functionNodes[fnReactFlowKey] = fnData;
      } else {
        fnData = { ...action.payload, isNewNode: true };
        fnReactFlowKey = createReactFlowFunctionKey(fnData);
        newState.curDataMapOperation.functionNodes[fnReactFlowKey] = fnData;
      }

      // Create connection entry to instantiate default connection inputs
      createConnectionEntryIfNeeded(newState.curDataMapOperation.dataMapConnections, fnData, fnReactFlowKey);

      doDataMapOperation(state, newState, 'Add function node');
    },
    saveDataMap: (
      state,
      action: PayloadAction<{
        sourceSchemaExtended: SchemaExtended | undefined;
        targetSchemaExtended: SchemaExtended | undefined;
      }>
    ) => {
      const sourceSchemaExtended = action.payload.sourceSchemaExtended;
      const targetSchemaExtended = action.payload.targetSchemaExtended;
      if (state.curDataMapOperation) {
        state.curDataMapOperation.sourceSchema = sourceSchemaExtended;
        state.curDataMapOperation.targetSchema = targetSchemaExtended;
      }
      state.pristineDataMap = state.curDataMapOperation;
      state.isDirty = false;
      state.sourceInEditState = false;
      state.targetInEditState = false;
    },
    updateFunctionPosition: (state, action: PayloadAction<{ id: string; position: XYPosition }>) => {
      const newOp = { ...state.curDataMapOperation };
      const node = newOp.functionNodes[action.payload.id];
      if (!node) {
        return;
      }
      newOp.functionNodes[action.payload.id] = {
        ...node,
        position: action.payload.position,
      };
      state.curDataMapOperation = newOp;
    },
    deleteFunction: (state, action: PayloadAction<string>) => {
      const reactFlowKey = action.payload;
      const currentDataMap = state.curDataMapOperation;
      const functionNode = currentDataMap.functionNodes[reactFlowKey];
      const newFunctionsState = { ...currentDataMap.functionNodes };

      if (functionNode) {
        delete newFunctionsState[reactFlowKey];

        const newConnections = deleteNodeFromConnections(currentDataMap.dataMapConnections, reactFlowKey);

        doDataMapOperation(
          state,
          {
            ...state,
            curDataMapOperation: {
              ...currentDataMap,
              functionNodes: newFunctionsState,
              dataMapConnections: newConnections,
              selectedItemConnectedNodes: {},
              selectedItemKey: '',
            },
          },
          'Delete function by key'
        );
        return;
      }
    },
    updateReactFlowNode: (state, action: PayloadAction<ReactFlowNodeAction>) => {
      const newState = { ...state.curDataMapOperation };
      const sourceNodesMap = { ...newState.sourceNodesMap };
      const targetNodesMap = { ...newState.targetNodesMap };
      if (action.payload.isSource) {
        if (action.payload.removeNode) {
          delete sourceNodesMap[action.payload.id];
        } else if (action.payload.node) {
          sourceNodesMap[action.payload.id] = action.payload.node;
        }
      } else if (action.payload.removeNode) {
        delete targetNodesMap[action.payload.id];
      } else if (action.payload.node) {
        targetNodesMap[action.payload.id] = action.payload.node;
      }

      state.curDataMapOperation = {
        ...newState,
        sourceNodesMap,
        targetNodesMap,
      };
    },
    updateReactFlowNodes: (state, action: PayloadAction<ReactFlowNodesUpdateProps>) => {
      const currentState = state.curDataMapOperation;
      const newState = {
        ...currentState,
      };

      if (action.payload.isSource) {
        newState.sourceNodesMap = action.payload.nodes;
      } else {
        newState.targetNodesMap = action.payload.nodes;
      }

      state.curDataMapOperation = newState;
    },
    setSelectedItem: (state, action: PayloadAction<string | undefined>) => {
      const key = action.payload;
      state.curDataMapOperation.selectedItemKey = key;
      state.curDataMapOperation.selectedItemConnectedNodes = getActiveNodes(state.curDataMapOperation, key);
    },
    toggleNodeExpandCollapse: (state, action: PayloadAction<ExpandCollapseAction>) => {
      const newState = { ...state.curDataMapOperation };
      const { keys, isExpanded } = action.payload;
      for (const key of keys) {
        if (action.payload.isSourceSchema) {
          newState.sourceOpenKeys[key] = isExpanded;
        } else {
          newState.targetOpenKeys[key] = isExpanded;
        }
      }

      doDataMapOperation(state, { ...state, curDataMapOperation: newState }, 'Toggle Node Expand/Collapse');
    },
    updateFunctionNodesPosition: (state, action: PayloadAction<Record<string, XYPosition>>) => {
      const newFunctionsState = { ...state.curDataMapOperation.functionNodes };
      for (const [key, position] of Object.entries(action.payload)) {
        if (newFunctionsState[key]) {
          newFunctionsState[key].position = position;
        }
      }
      state = {
        ...state,
        curDataMapOperation: {
          ...state.curDataMapOperation,
          functionNodes: newFunctionsState,
        },
        lastAction: 'Update function nodes',
      };
    },
    updateEdgePopOverId: (state, action: PayloadAction<string | undefined>) => {
      state.curDataMapOperation.edgePopOverId = action.payload;
    },
    deleteEdge: (state, action: PayloadAction<string>) => {
      const edgeId = action.payload;
      const splitId = splitEdgeId(edgeId);
      if (splitId.length === 2) {
        const sourceId = splitId[0];
        const targetId = splitId[1];

        // Update connection dictionary
        const updatedConnections = {
          ...state.curDataMapOperation.dataMapConnections,
        };
        deleteConnectionFromConnections(updatedConnections, sourceId, targetId, undefined);

        doDataMapOperation(
          state,
          {
            ...state,
            curDataMapOperation: {
              ...state.curDataMapOperation,
              dataMapConnections: updatedConnections,
            },
          },
          'Delete edge by key'
        );

        // Reset selected state
        state.curDataMapOperation.selectedItemConnectedNodes = getActiveNodes(
          state.curDataMapOperation,
          state.curDataMapOperation.selectedItemKey
        );

        // Remove temporary Nodes created for scrolling
        deleteIntermediateConnectionsCreatedForScrolling([sourceId, targetId], state.curDataMapOperation);

        // Remove temporary Nodes created for collapsing/expanding parents
        deleteIntermediateConnectionsForCollapsingNodes(sourceId, targetId, state.curDataMapOperation);
      } else {
        //Throw error
      }
    },
    toggleSourceEditState: (state, action: PayloadAction<boolean>) => {
      doDataMapOperation(
        state,
        {
          ...state,
          sourceInEditState: action.payload,
        },
        'Edit source schema'
      );
    },
    toggleTargetEditState: (state, action: PayloadAction<boolean>) => {
      doDataMapOperation(
        state,
        {
          ...state,
          targetInEditState: action.payload,
        },
        'Edit target schema'
      );
    },
    setHoverState: (state, action: PayloadAction<HoverState | undefined>) => {
      const currentState = state.curDataMapOperation.state ?? {};
      state.curDataMapOperation.state = {
        ...currentState,
        hover: action.payload,
      };
    },
    updateCanvasDimensions: (state, action: PayloadAction<Rect>) => {
      state.curDataMapOperation.loadedMapMetadata = {
        ...(state.curDataMapOperation.loadedMapMetadata ?? {
          canvasRect: emptyCanvasRect,
          functionNodes: [],
        }),
        canvasRect: action.payload,
      };
    },
    updateCanvasNodesForScroll: (state, action: PayloadAction<Record<string, Node>>) => {
      state.curDataMapOperation.nodesForScroll = action.payload;
    },
    updateTemporaryNodeDirection: (
      state,
      action: PayloadAction<{
        id: string;
        direction: 'top' | 'bottom' | undefined;
      }>
    ) => {
      const { id, direction } = action.payload;
      if (direction) {
        state.curDataMapOperation.intermediateEdgeMappingDirectionForScrolling[id] = direction;
      } else if (state.curDataMapOperation.intermediateEdgeMappingDirectionForScrolling[id]) {
        delete state.curDataMapOperation.intermediateEdgeMappingDirectionForScrolling[id];
      }
    },
  },
});

export const {
  setXsltFilename,
  setXsltContent,
  setInitialSchema,
  setInitialDataMap,
  setSelectedItem,
  updateReactFlowNodes,
  updateReactFlowNode,
  makeConnectionFromMap,
  updateDataMapLML,
  saveDataMap,
  createInputSlotForUnboundedInput,
  setConnectionInput,
  addFunctionNode,
  deleteFunction,
  updateFunctionPosition,
  toggleNodeExpandCollapse,
  updateFunctionNodesPosition,
  updateEdgePopOverId,
  deleteEdge,
  toggleSourceEditState,
  toggleTargetEditState,
  setHoverState,
  updateCanvasDimensions,
  updateCanvasNodesForScroll,
  updateTemporaryNodeDirection,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;

/* eslint-disable no-param-reassign */
const doDataMapOperation = (state: DataMapState, newCurrentState: DataMapState, action: string) => {
  if (LogService.logToConsole) {
    console.log(`Action: ${action}`);
  }

  state.curDataMapOperation = newCurrentState.curDataMapOperation;
  state.lastAction = action;
  state.sourceInEditState = newCurrentState.sourceInEditState;
  state.targetInEditState = newCurrentState.targetInEditState;
  state.isDirty = true;
};

const addConnection = (
  newConnections: ConnectionDictionary,
  nodes: ConnectionAction,
  destinationNode: SchemaNodeExtended | FunctionData,
  sourceNode: SchemaNodeExtended | FunctionData
): void => {
  applyConnectionValue(newConnections, {
    targetNode: destinationNode,
    targetNodeReactFlowKey: nodes.reactFlowDestination,
    findInputSlot: true,
    inputIndex: nodes.specificInput,
    input: {
      reactFlowKey: nodes.reactFlowSource,
      node: sourceNode,
    },
  });
};

// Exported to be tested
export const deleteNodeFromConnections = (connections: ConnectionDictionary, keyToDelete: string): ConnectionDictionary => {
  const newConnections = { ...connections };

  if (newConnections[keyToDelete]) {
    // Step through all the connected inputs and delete the selected key from their outputs
    flattenInputs(newConnections[keyToDelete].inputs).forEach((input) => {
      if (isConnectionUnit(input)) {
        newConnections[input.reactFlowKey].outputs = newConnections[input.reactFlowKey].outputs.filter(
          (output) => output.reactFlowKey !== keyToDelete
        );
      }
    });

    // Step through all the outputs and delete the selected key from their inputs
    newConnections[keyToDelete].outputs.forEach((outputConnection) => {
      Object.values(newConnections[outputConnection.reactFlowKey].inputs).forEach((outputConnectionInput, index) => {
        newConnections[outputConnection.reactFlowKey].inputs[index] = outputConnectionInput.filter((input) =>
          isConnectionUnit(input) ? input.reactFlowKey !== keyToDelete : true
        );
      });
    });
  }

  delete newConnections[keyToDelete];

  return newConnections;
};

export const deleteConnectionFromConnections = (
  connections: ConnectionDictionary,
  inputKey: string,
  outputKey: string,
  port: string | undefined
) => {
  connections[inputKey].outputs = connections[inputKey].outputs.filter((output) => output.reactFlowKey !== outputKey);

  const outputNode = connections[outputKey].self.node;
  const outputNodeInputs = connections[outputKey].inputs;
  if (isFunctionData(outputNode) && outputNode?.maxNumberOfInputs === UnboundedInput) {
    Object.values(outputNodeInputs).forEach((input, inputIndex) =>
      input.forEach((inputValue, inputValueIndex) => {
        if (isConnectionUnit(inputValue) && inputValue.reactFlowKey === inputKey) {
          if (!port || (port && generateInputHandleId(outputNode.inputs[inputIndex].name, inputValueIndex) === port)) {
            outputNodeInputs[inputIndex][inputValueIndex] = undefined;
          }
        }
      })
    );
  } else {
    Object.entries(outputNodeInputs).forEach(
      ([key, input]) =>
        (outputNodeInputs[key] = input.filter((inputEntry) => (isConnectionUnit(inputEntry) ? inputEntry.reactFlowKey !== inputKey : true)))
    );
  }
};

export const deleteParentRepeatingConnections = (connections: ConnectionDictionary, inputKey: string /* contains prefix */) => {
  const parentId = getParentId(inputKey);
  if (parentId.endsWith(`${SchemaType.Source}-`)) {
    return;
  }

  // find connections for parent
  const allConnectionIds = Object.keys(connections);
  const parentSourceIsConnected = allConnectionIds.includes(parentId);
  if (!parentSourceIsConnected) {
    deleteParentRepeatingConnections(connections, parentId);
    return;
  }

  const parentNode = connections[parentId].self.node;
  if (isSchemaNodeExtended(parentNode) && parentNode.nodeProperties.includes(SchemaNodeProperty.Repeating)) {
    // find all connections with this parent, if any, break
    const hasAnyChildRepeatingConnections = allConnectionIds.some((id) => {
      const hasChildConnection = id.includes(parentId) && id !== parentId;
      const possibleTargetOutput = getConnectedTargetSchemaNodes([connections[id]], connections);
      const hasOutputThatReachesTarget = possibleTargetOutput.length !== 0;
      return hasChildConnection && hasOutputThatReachesTarget;
    });
    if (!hasAnyChildRepeatingConnections) {
      connections[parentId].outputs.forEach((output) => {
        if (output.reactFlowKey.includes('target')) {
          // make sure connection is direct to target, not an index or other func
          deleteConnectionFromConnections(connections, parentId, connections[parentId].outputs[0].reactFlowKey, undefined);
        }
      });

      deleteParentRepeatingConnections(connections, parentId);
    }
  }
};

export const handleDirectAccessConnection = (
  sourceNode: SchemaNodeExtended | FunctionData,
  action: ConnectionAction,
  newState: DataMapOperationState,
  destinationNode: SchemaNodeExtended | FunctionData
) => {
  // Add any repeating parent nodes as well (except for Direct Access's)
  // Get all the source nodes in case we have sources from multiple source chains
  const originalSourceNode = sourceNode;
  let actualSources: SchemaNodeExtended[];

  if (!(isFunctionData(originalSourceNode) && originalSourceNode.key === directAccessPseudoFunctionKey)) {
    if (isFunctionData(originalSourceNode)) {
      const sourceNodes = getConnectedSourceSchemaNodes([newState.dataMapConnections[action.reactFlowSource]], newState.dataMapConnections);
      actualSources = sourceNodes;
    } else {
      actualSources = [originalSourceNode];
    }

    // We'll only have one output node in this case
    const originalTargetNode = destinationNode;
    let actualTarget: SchemaNodeExtended[];
    if (isFunctionData(originalTargetNode)) {
      const targetNodes = getConnectedTargetSchemaNodes(
        [newState.dataMapConnections[action.reactFlowDestination]],
        newState.dataMapConnections
      );
      actualTarget = targetNodes;
    } else {
      actualTarget = [originalTargetNode];
    }

    actualSources.forEach((_sourceNode) => {
      if (actualTarget.length > 0) {
        // const wasNewArrayConnectionAdded = addParentConnectionForRepeatingElementsNested(
        //   sourceNode,
        //   actualTarget[0],
        //   newState.flattenedSourceSchema,
        //   newState.flattenedTargetSchema,
        //   newState.dataMapConnections
        // );
        // add back in once notifications are discussed
        // if (wasNewArrayConnectionAdded) {
        //   state.notificationData = { type: NotificationTypes.ArrayConnectionAdded };
        // }
      }
    });
  }
};

export const assignFunctionNodePositionsFromMetadata = (
  connections: ConnectionDictionary,
  metadata: FunctionMetadata[],
  functions: FunctionDictionary
) => {
  Object.keys(functions).forEach((key) => {
    // find matching metadata
    const generatedMetadata = generateFunctionConnectionMetadata(key, connections);
    const id = convertConnectionShorthandToId(generatedMetadata);
    const matchingMetadata = metadata.find((meta) => meta.connectionShorthand === id);

    // assign position data to function in store
    functions[key] = {
      ...functions[key],
      position: matchingMetadata?.position,
    };
  });
  return functions;
};

export const getUpdatedIntermediateConnectionsForScrolling = (
  currentConnections: Record<string, Record<string, boolean>>,
  sourceId: string,
  targetId: string,
  allTemporaryNodeIds: string[],
  directions: NodeScrollDirection[]
) => {
  const newConnections: Record<string, boolean> = {};
  for (const direction of directions) {
    const id = getNodeIdForScroll(allTemporaryNodeIds, direction);
    if (id) {
      newConnections[createTemporaryEdgeId(targetId, id)] = true;
    }
  }
  return { ...(currentConnections[sourceId] ?? {}), ...newConnections };
};

export const getUpdatedIntermediateConnectionsForCollapsing = (
  allConnections: Record<string, Record<string, boolean>>,
  sourceId: string,
  targetId: string,
  node?: SchemaNodeExtended
) => {
  if (node) {
    const allParents = node.pathToRoot;
    for (const parent of allParents) {
      const key = parent.key;
      const id = isSourceNode(sourceId)
        ? createEdgeId(addSourceReactFlowPrefix(key), targetId)
        : createEdgeId(targetId, addTargetReactFlowPrefix(key));
      // Map parents to the target node to store temporary edges
      if (key !== getTreeNodeId(sourceId)) {
        allConnections = {
          ...allConnections,
          [sourceId]: {
            ...(allConnections[sourceId] ?? {}),
            [id]: true,
          },
        };
      }
    }
  }

  return allConnections;
};

export const deleteIntermediateConnectionsForCollapsingNodes = (sourceId: string, targetId: string, state: DataMapOperationState) => {
  const allConnections = { ...state.intermediateEdgeMappingForCollapsing };
  const deleteAllParentConnections = (sId: string, tId: string, node?: SchemaNodeExtended) => {
    if (node) {
      const allParents = node.pathToRoot;
      for (const parentKey of allParents) {
        const id = isSourceNode(sId)
          ? createEdgeId(addSourceReactFlowPrefix(parentKey.key), tId)
          : createEdgeId(tId, addTargetReactFlowPrefix(parentKey.key));
        if (allConnections[sId] && allConnections[sId][id]) {
          delete allConnections[sId][id];
        }
      }
    }
  };

  if (isSourceNode(sourceId)) {
    deleteAllParentConnections(sourceId, targetId, state.flattenedSourceSchema[sourceId]);
  }

  if (isTargetNode(targetId)) {
    deleteAllParentConnections(targetId, sourceId, state.flattenedTargetSchema[targetId]);
  }

  state.intermediateEdgeMappingForCollapsing = { ...allConnections };
};

export const deleteIntermediateConnectionsCreatedForScrolling = (ids: string[], state: DataMapOperationState) => {
  const deleteConnections = (id: string, connections?: Record<string, boolean>) => {
    if (connections) {
      for (const key of Object.keys(connections)) {
        const splitIds = splitEdgeId(key);
        if (splitIds.length >= 2 && splitIds[0] === id) {
          delete connections[key];
        }
      }
    }
  };

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const id1 = ids[i];
      const id2 = ids[j];
      if (isSourceNode(id1) || isTargetNode(id1)) {
        deleteConnections(id2, state.intermediateEdgeMappingForScrolling[id1]);
      }

      if (isSourceNode(id2) || isTargetNode(id2)) {
        deleteConnections(id1, state.intermediateEdgeMappingForScrolling[id2]);
      }
    }
  }
};

export const addIntermediateConnections = (sourceId: string, targetId: string, state: DataMapOperationState) => {
  const addIntermediateConnectionState = (sId: string, tId: string, directions: NodeScrollDirection[], node?: SchemaNodeExtended) => {
    if (node) {
      state.intermediateEdgeMappingForCollapsing = getUpdatedIntermediateConnectionsForCollapsing(
        state.intermediateEdgeMappingForCollapsing,
        sId,
        tId,
        node as SchemaNodeExtended
      );
    }

    state.intermediateEdgeMappingForScrolling = {
      ...state.intermediateEdgeMappingForScrolling,
      [sId]: getUpdatedIntermediateConnectionsForScrolling(
        state.intermediateEdgeMappingForScrolling,
        sId,
        tId,
        Object.keys(state.nodesForScroll),
        directions
      ),
    };
  };

  if (isSourceNode(sourceId)) {
    addIntermediateConnectionState(sourceId, targetId, ['top-left', 'bottom-left'], state.flattenedSourceSchema[sourceId]);
  }

  if (isTargetNode(targetId)) {
    addIntermediateConnectionState(targetId, sourceId, ['top-right', 'bottom-right'], state.flattenedTargetSchema[targetId]);
  }
};
