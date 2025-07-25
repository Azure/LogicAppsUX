import type { ConnectionDictionary, InputConnection } from '../../models/Connection';
import { directAccessPseudoFunctionKey, type FunctionData, type FunctionDictionary } from '../../models/Function';
import type { Draft } from 'immer';
import {
  applyConnectionValue,
  createConnectionEntryIfNeeded,
  createNewEmptyConnection,
  createNodeConnection,
  generateInputHandleId,
  getActiveNodes,
  getConnectedSourceSchemaNodes,
  getConnectedTargetSchemaNodes,
  isNodeConnection,
  isCustomValueConnection,
  isEmptyConnection,
} from '../../utils/Connection.Utils';
import type { UnknownNode } from '../../utils/DataMap.Utils';
import { addParentConnectionForRepeatingElementsNested, getParentId } from '../../utils/DataMap.Utils';
import { assignFunctionNodePositionsFromMetadata, createFunctionDictionary, isFunctionData } from '../../utils/Function.Utils';
import { flattenSchemaIntoDictionary, flattenSchemaNode, isSchemaNodeExtended, flattenSchemaIntoSortArray } from '../../utils/Schema.Utils';
import type { MapMetadataV2, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { emptyCanvasRect, guid, SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { Rect, XYPosition } from '@xyflow/react';
import { createReactFlowFunctionKey, isFunctionNode, isSourceNode, isTargetNode } from '../../utils/ReactFlow.Util';
import { UnboundedInput } from '../../constants/FunctionConstants';
import { splitEdgeId } from '../../utils/Edge.Utils';
import { doesFunctionMetadataExist } from '../../utils/Metadata.utils';

export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  sourceInEditState: boolean;
  targetInEditState: boolean;
  sourceNodeConnectionBeingDrawnFromId?: string;
  lastAction: string;
  isTestDisabledForOS?: boolean;
}

interface HoverState {
  id: string;
  type: 'node' | 'edge' | 'function';
  isSourceSchema?: boolean;
}

interface ComponentState {
  hover?: HoverState;
}

const getIntermedateScrollNodeHandles = (guid: string) => {
  const record: Record<string, string> = {};
  record['top-left'] = `top-left-${guid}`;
  record['bottom-left'] = `bottom-left-${guid}`;
  record['top-right'] = `top-right-${guid}`;
  record['bottom-right'] = `bottom-right-${guid}`;
  return record;
};
export interface Draft2 {
  draft: Draft<DataMapState>;
}

export interface SchemaTreeDataProps {
  visibleNodes: SchemaNodeExtended[];
  startIndex: number;
  endIndex: number;
}

export interface DataMapOperationState {
  dataMapConnections: ConnectionDictionary;
  dataMapLML: string;
  needsLayout?: boolean;
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
  // Track open nodes in the scehma Tree
  sourceOpenKeys: Record<string, boolean>;
  targetOpenKeys: Record<string, boolean>;
  // Mapping used to store which connection is a loop
  edgeLoopMapping: Record<string, boolean>;
  // Temporary Nodes for when the scrolling is happening and the tree-nodes are not in view
  // For each corner of the canvas
  nodesForScroll: Record<string, string>;
  sourceSchemaTreeData: SchemaTreeDataProps;
  targetSchemaTreeData: SchemaTreeDataProps;
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
  sourceOpenKeys: {},
  targetOpenKeys: {},
  edgeLoopMapping: {},
  sourceSchemaTreeData: {
    startIndex: -1,
    endIndex: -1,
    visibleNodes: [],
  },
  targetSchemaTreeData: {
    startIndex: -1,
    endIndex: -1,
    visibleNodes: [],
  },
  nodesForScroll: getIntermedateScrollNodeHandles(guid()),
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
  handles: any[];
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
  input: InputConnection | null | undefined; // null is indicator to remove an unbounded input value
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
        currentState.sourceSchemaTreeData.visibleNodes = [];
        state.pristineDataMap.sourceSchema = action.payload.schema;
        state.pristineDataMap.flattenedSourceSchema = flattenedSchema;

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
        currentState.targetSchemaTreeData.visibleNodes = [];
        state.pristineDataMap.targetSchema = action.payload.schema;
        state.pristineDataMap.flattenedTargetSchema = flattenedSchema;
        state.pristineDataMap.targetSchemaOrdering = targetSchemaSortArray;

        state.targetInEditState = false;
        state.lastAction = 'Set initial Target schema';
      }

      state.curDataMapOperation = { ...currentState };
    },

    setNeedsLayout: (state, action: PayloadAction<boolean>) => {
      state.curDataMapOperation.needsLayout = action.payload;
    },

    setInitialDataMap: (state, action: PayloadAction<InitialDataMapAction>) => {
      const { sourceSchema, targetSchema, dataMapConnections, metadata } = action.payload;
      const currentState = state.curDataMapOperation;
      const flattenedSourceSchema = flattenSchemaIntoDictionary(sourceSchema, SchemaType.Source);
      const flattenedTargetSchema = flattenSchemaIntoDictionary(targetSchema, SchemaType.Target);
      const targetSchemaSortArray = flattenSchemaIntoSortArray(targetSchema.schemaTreeRoot);

      const functionNodes: FunctionDictionary = createFunctionDictionary(dataMapConnections, flattenedTargetSchema);

      assignFunctionNodePositionsFromMetadata(dataMapConnections, metadata?.functionNodes ?? [], functionNodes);

      const needsLayout = !doesFunctionMetadataExist(metadata);
      console.log('needsLayout', needsLayout);

      const newState: DataMapOperationState = {
        ...currentState,
        needsLayout: true,
        sourceSchema,
        targetSchema,
        flattenedSourceSchema,
        flattenedTargetSchema,
        functionNodes,
        targetSchemaOrdering: targetSchemaSortArray,
        dataMapConnections: dataMapConnections ?? {},
        loadedMapMetadata: metadata,
        sourceSchemaTreeData: {
          startIndex: -1,
          endIndex: -1,
          visibleNodes: [],
        },
        targetSchemaTreeData: {
          startIndex: -1,
          endIndex: -1,
          visibleNodes: [],
        },
      };

      state.curDataMapOperation = newState;
      state.isDirty = false;
      state.sourceInEditState = false;
      state.targetInEditState = false;
      state.pristineDataMap = newState;
      state.lastAction = 'Set initial data map';
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
      newState.curDataMapOperation.dataMapConnections[action.payload].inputs.push(createNewEmptyConnection());

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

      if (!(isFunctionNode(originalSourceNodeId) && originalSourceNodeId === directAccessPseudoFunctionKey)) {
        if (isFunctionNode(originalSourceNodeId)) {
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
        if (isFunctionNode(originalTargetNodeId)) {
          const targetNodes = getConnectedTargetSchemaNodes(
            [newState.curDataMapOperation.dataMapConnections[action.payload.reactFlowDestination]],
            newState.curDataMapOperation.dataMapConnections
          );
          actualTarget = targetNodes;
        } else {
          actualTarget = [state.curDataMapOperation.flattenedTargetSchema[originalTargetNodeId]];
        }

        const countSlashes = (inputString: string) => {
          let count = 0;
          for (const character of inputString) {
            if (character === '/') {
              count++;
            }
          }
          return count;
        };

        const sortedSources = schemaSources.sort((a, b) => (countSlashes(a.key) < countSlashes(b.key) ? 1 : -1)); // to prevent connection out of order
        sortedSources.forEach((sourceNode) => {
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
    deleteConnectionFromFunctionMenu: (state, action: PayloadAction<{ inputIndex: number; targetId: string }>) => {
      const newConnections = {
        ...state.curDataMapOperation.dataMapConnections,
      };
      const { inputIndex, targetId } = action.payload;
      const inputs = newConnections[targetId].inputs;
      const inputValueToRemove = inputs[inputIndex];
      if (!isEmptyConnection(inputValueToRemove)) {
        const sourceIdToRemove = isCustomValueConnection(inputValueToRemove) ? inputValueToRemove.value : inputValueToRemove.reactFlowKey;
        deleteConnectionFromConnections(newConnections, sourceIdToRemove, targetId, undefined);
      }

      doDataMapOperation(
        state,
        {
          ...state,
          curDataMapOperation: {
            ...state.curDataMapOperation,
            dataMapConnections: newConnections,
          },
        },
        'Delete connection from function menu'
      );
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
    updateFunctionConnectionInputs: (state, action: PayloadAction<{ functionKey: string; inputs: InputConnection[] }>) => {
      const newState = { ...state.curDataMapOperation };
      if (newState.dataMapConnections[action.payload.functionKey]?.inputs[0]) {
        newState.dataMapConnections[action.payload.functionKey].inputs = action.payload.inputs;
      } else {
        throw new Error('Function node not found in connections');
      }

      doDataMapOperation(state, { ...state, curDataMapOperation: newState }, 'Update function connection inputs');
    },
    updateTreeData: (state, action: PayloadAction<{ key: string; data: SchemaTreeDataProps }>) => {
      if (isSourceNode(action.payload.key)) {
        state.curDataMapOperation.sourceSchemaTreeData = {
          ...action.payload.data,
        };
      } else {
        state.curDataMapOperation.targetSchemaTreeData = {
          ...action.payload.data,
        };
      }
    },
    changeIsTestDisabledForOS: (state, action: PayloadAction<boolean>) => {
      state.isTestDisabledForOS = action.payload;
    },
  },
});

export const {
  setNeedsLayout,
  setXsltFilename,
  setXsltContent,
  setInitialSchema,
  setInitialDataMap,
  setSelectedItem,
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
  deleteConnectionFromFunctionMenu,
  toggleSourceEditState,
  toggleTargetEditState,
  setHoverState,
  updateCanvasDimensions,
  updateFunctionConnectionInputs,
  updateTreeData,
  changeIsTestDisabledForOS,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;

/* eslint-disable no-param-reassign */
const doDataMapOperation = (state: DataMapState, newCurrentState: DataMapState, action: string) => {
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
    input: createNodeConnection(sourceNode, nodes.reactFlowSource),
  });
};

// Exported to be tested
export const deleteNodeFromConnections = (connections: ConnectionDictionary, keyToDelete: string): ConnectionDictionary => {
  const newConnections = { ...connections };

  if (newConnections[keyToDelete]) {
    // Step through all the connected inputs and delete the selected key from their outputs
    newConnections[keyToDelete].inputs.forEach((input) => {
      if (isNodeConnection(input)) {
        newConnections[input.reactFlowKey].outputs = newConnections[input.reactFlowKey].outputs.filter(
          (output) => output.reactFlowKey !== keyToDelete
        );
      }
    });

    // Step through all the outputs and delete the selected key from their inputs
    newConnections[keyToDelete].outputs.forEach((outputConnection) => {
      newConnections[outputConnection.reactFlowKey].inputs = newConnections[outputConnection.reactFlowKey].inputs.filter((input) =>
        isNodeConnection(input) ? input.reactFlowKey !== keyToDelete : true
      );
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
  if (connections[inputKey] !== undefined) {
    connections[inputKey].outputs = connections[inputKey].outputs.filter((output) => output.reactFlowKey !== outputKey);
  }
  const outputNode = connections[outputKey]?.self?.node;
  let outputNodeInputs = connections[outputKey]?.inputs ?? [];

  if (outputNode && isFunctionData(outputNode) && outputNode?.maxNumberOfInputs === UnboundedInput) {
    outputNodeInputs.forEach((input, inputIndex) => {
      if (isNodeConnection(input) && input.reactFlowKey === inputKey) {
        if (!port || (port && generateInputHandleId(outputNode.inputs[inputIndex].name, inputIndex) === port)) {
          outputNodeInputs[inputIndex] = createNewEmptyConnection();
        }
      }
    });
  } else {
    outputNodeInputs = outputNodeInputs.map((inputEntry) => {
      if (
        (isNodeConnection(inputEntry) && inputEntry.reactFlowKey === inputKey) ||
        (isCustomValueConnection(inputEntry) && inputEntry.value === inputKey)
      ) {
        return createNewEmptyConnection();
      }
      return inputEntry;
    });
  }
  connections[outputKey].inputs = outputNodeInputs;
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
