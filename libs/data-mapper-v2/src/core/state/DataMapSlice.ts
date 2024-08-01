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
import { getParentId } from '../../utils/DataMap.Utils';
import { createFunctionDictionary, isFunctionData } from '../../utils/Function.Utils';
import { LogService } from '../../utils/Logging.Utils';
import {
  flattenSchemaIntoDictionary,
  flattenSchemaNode,
  getChildParentSchemaMapping,
  isSchemaNodeExtended,
  flattenSchemaIntoSortArray,
} from '../../utils/Schema.Utils';
import type {
  FunctionMetadata,
  MapMetadataV2,
  SchemaExtended,
  SchemaNodeDictionary,
  SchemaNodeExtended,
} from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { convertConnectionShorthandToId, generateFunctionConnectionMetadata } from '../../mapHandling/MapMetadataSerializer';
import type { Node, XYPosition } from '@xyflow/react';
import { createReactFlowFunctionKey } from '../../utils/ReactFlow.Util';
import { UnboundedInput } from '../../constants/FunctionConstants';
export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  sourceNodeConnectionBeingDrawnFromId?: string;
}

export interface DataMapOperationState {
  dataMapConnections: ConnectionDictionary;
  dataMapLML: string;
  sourceSchema?: SchemaExtended;
  flattenedSourceSchema: SchemaNodeDictionary;
  sourceSchemaOrdering: string[];
  targetSchema?: SchemaExtended;
  flattenedTargetSchema: SchemaNodeDictionary;
  targetSchemaOrdering: string[];
  functionNodes: FunctionDictionary;
  selectedItemKey?: string;
  selectedItemConnectedNodes: Record<string, string>; // not really using the second string yet...
  xsltFilename: string;
  xsltContent: string;
  inlineFunctionInputOutputKeys: string[];
  lastAction: string;
  loadedMapMetadata?: MapMetadataV2;
  // Save the temporary state of edges to be used for rendering when tree node is expanded/collapsed
  // This info is not saved in LML which is why it is stored separately in the store
  sourceTemporaryStateConnections: Record<string, Record<string, boolean>>;
  targetTemporaryStateConnections: Record<string, Record<string, boolean>>;
  // Generic reactflow node mapping for each node in the scehma
  sourceNodesMap: Record<string, Node>;
  targetNodesMap: Record<string, Node>;
  // Child Parent mapping stores the list of parent nodes for each child node up until the root
  sourceChildParentMapping: Record<string, string[]>;
  targetChildParentMapping: Record<string, string[]>;
  // Parent child edge mapping stores the list of edges for each parent node for its children
  sourceParentChildEdgeMapping: Record<string, Record<string, boolean>>;
  targetParentChildEdgeMapping: Record<string, Record<string, boolean>>;
  // Track open nodes in the scehma Tree
  sourceOpenKeys: Record<string, boolean>;
  targetOpenKeys: Record<string, boolean>;
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  dataMapLML: '',
  functionNodes: {},
  flattenedSourceSchema: {},
  sourceSchemaOrdering: [],
  flattenedTargetSchema: {},
  targetSchemaOrdering: [],
  xsltFilename: '',
  xsltContent: '',
  inlineFunctionInputOutputKeys: [],
  selectedItemConnectedNodes: {},
  lastAction: 'Pristine',
  sourceNodesMap: {},
  targetNodesMap: {},
  sourceChildParentMapping: {},
  targetChildParentMapping: {},
  sourceParentChildEdgeMapping: {},
  targetParentChildEdgeMapping: {},
  sourceOpenKeys: {},
  targetOpenKeys: {},
  sourceTemporaryStateConnections: {},
  targetTemporaryStateConnections: {},
};

const initialState: DataMapState = {
  pristineDataMap: emptyPristineState,
  curDataMapOperation: emptyPristineState,
  isDirty: false,
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
        const sourceSchemaSortArray = flattenedSourceSchema.map((node) => node.key);

        currentState.sourceSchema = action.payload.schema;
        currentState.sourceChildParentMapping = getChildParentSchemaMapping(action.payload.schema);
        currentState.sourceOpenKeys = flattenedSourceSchema
          .filter((node) => node.children.length > 0)
          .reduce((acc: Record<string, boolean>, node: SchemaNodeExtended) => {
            acc[node.key] = true;
            return acc;
          }, {});
        currentState.flattenedSourceSchema = flattenedSchema;
        currentState.sourceSchemaOrdering = sourceSchemaSortArray;
        state.pristineDataMap.sourceSchema = action.payload.schema;
        state.pristineDataMap.flattenedSourceSchema = flattenedSchema;
        state.pristineDataMap.sourceSchemaOrdering = sourceSchemaSortArray;

        // NOTE: Reset ReactFlow nodes to filter out source nodes
        currentState.sourceNodesMap = {};
      } else {
        const flattenedTargetSchema = flattenSchemaNode(action.payload.schema.schemaTreeRoot);
        const targetSchemaSortArray = flattenedTargetSchema.map((node) => node.key);
        currentState.targetSchema = action.payload.schema;
        currentState.targetChildParentMapping = getChildParentSchemaMapping(action.payload.schema);
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
      }

      state.curDataMapOperation = { ...currentState };
    },

    setInitialDataMap: (state, action: PayloadAction<InitialDataMapAction>) => {
      const { sourceSchema, targetSchema, dataMapConnections, metadata } = action.payload;
      const currentState = state.curDataMapOperation;
      const flattenedSourceSchema = flattenSchemaIntoDictionary(sourceSchema, SchemaType.Source);
      const sourceSchemaSortArray = flattenSchemaIntoSortArray(sourceSchema.schemaTreeRoot);
      const flattenedTargetSchema = flattenSchemaIntoDictionary(targetSchema, SchemaType.Target);
      const targetSchemaSortArray = flattenSchemaIntoSortArray(targetSchema.schemaTreeRoot);

      const functionNodes: FunctionDictionary = createFunctionDictionary(dataMapConnections, flattenedTargetSchema);
      assignFunctionNodePositionsFromMetadata(dataMapConnections, metadata?.functionNodes ?? [], functionNodes);

      // const addedNodes = Object.entries(functionNodes).map((funcTuple) => {
      //   const func = funcTuple[1];
      //   const id = funcTuple[0];
      //   const node: Node = {
      //     id: id,
      //     type: 'function',
      //     position: func.position || { x: 100, y: 100 }, // find layout if none found
      //     data: { id, func },
      //   };
      //   return node;
      // });

      const newState: DataMapOperationState = {
        ...currentState,
        sourceSchema,
        targetSchema,
        flattenedSourceSchema,
        sourceSchemaOrdering: sourceSchemaSortArray,
        flattenedTargetSchema,
        functionNodes,
        targetSchemaOrdering: targetSchemaSortArray,
        dataMapConnections: dataMapConnections ?? {},
        loadedMapMetadata: metadata,
      };

      state.curDataMapOperation = newState;
      state.pristineDataMap = newState;
    },

    createInputSlotForUnboundedInput: (state, action: PayloadAction<string>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      newState.dataMapConnections[action.payload].inputs[0].push(undefined);

      doDataMapOperation(state, newState, 'Set connection input value');
    },

    setConnectionInput: (state, action: PayloadAction<SetConnectionInputAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      applyConnectionValue(newState.dataMapConnections, action.payload);

      newState.selectedItemConnectedNodes = getActiveNodes(newState.dataMapConnections, state.curDataMapOperation.selectedItemKey);

      doDataMapOperation(state, newState, 'Set connection input value');
    },

    makeConnectionFromMap: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
        functionNodes: { ...state.curDataMapOperation.functionNodes },
        sourceParentChildEdgeMapping: {
          ...state.curDataMapOperation.sourceParentChildEdgeMapping,
        },
        targetParentChildEdgeMapping: {
          ...state.curDataMapOperation.targetParentChildEdgeMapping,
        },
      };

      let sourceNode: UnknownNode;
      const { reactFlowSource, reactFlowDestination } = action.payload;

      if (reactFlowSource.startsWith(SchemaType.Source)) {
        sourceNode = state.curDataMapOperation.flattenedSourceSchema[reactFlowSource];
        const nodeKey = sourceNode.key;

        // Add connection mapping for all parents
        const allParents = newState.sourceChildParentMapping[nodeKey] ?? [];
        for (const parentKey of allParents) {
          if (!newState.sourceParentChildEdgeMapping[parentKey]) {
            newState.sourceParentChildEdgeMapping[parentKey] = {};
          }
          newState.sourceParentChildEdgeMapping[parentKey][nodeKey] = true;
        }

        state.curDataMapOperation.sourceParentChildEdgeMapping = newState.sourceParentChildEdgeMapping;
      } else {
        sourceNode = newState.functionNodes[reactFlowSource];
      }
      let destinationNode: UnknownNode;

      if (reactFlowDestination.startsWith(SchemaType.Target)) {
        destinationNode = state.curDataMapOperation.flattenedTargetSchema[reactFlowDestination];
        const nodeKey = destinationNode.key;
        // Add connection mapping for all parents
        const allParents = newState.targetChildParentMapping[nodeKey] ?? [];
        for (const parentKey of allParents) {
          if (!newState.targetParentChildEdgeMapping[parentKey]) {
            newState.targetParentChildEdgeMapping[parentKey] = {};
          }
          newState.targetParentChildEdgeMapping[parentKey][nodeKey] = true;
        }

        state.curDataMapOperation.targetParentChildEdgeMapping = newState.targetParentChildEdgeMapping;
      } else {
        destinationNode = newState.functionNodes[action.payload.reactFlowDestination];
        if (destinationNode?.maxNumberOfInputs === UnboundedInput) {
          action.payload.specificInput = 0;
        }
      }

      addConnection(newState.dataMapConnections, action.payload, destinationNode, sourceNode);

      newState.selectedItemConnectedNodes = getActiveNodes(newState.dataMapConnections, state.curDataMapOperation.selectedItemKey);

      if (isFunctionData(sourceNode)) {
        doDataMapOperation(state, newState, 'Updated function node locations by adding');
      }

      handleDirectAccessConnection(sourceNode, action.payload, newState, destinationNode);

      doDataMapOperation(state, newState, 'Make connection');
    },

    updateDataMapLML: (state, action: PayloadAction<string>) => {
      state.curDataMapOperation.dataMapLML = action.payload;
    },

    addFunctionNode: (state, action: PayloadAction<FunctionData | { functionData: FunctionData; newReactFlowKey: string }>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        functionNodes: { ...state.curDataMapOperation.functionNodes },
      };

      let fnReactFlowKey: string;
      let fnData: FunctionData;

      // Default - just provide the FunctionData and the key will be handled under the hood
      if ('newReactFlowKey' in action.payload) {
        // Alternative - specify the key you want to use (needed for adding inline Functions)
        fnData = action.payload.functionData;
        fnReactFlowKey = action.payload.newReactFlowKey;
        newState.functionNodes[fnReactFlowKey] = fnData;
      } else {
        fnData = { ...action.payload, isNewNode: true };
        fnReactFlowKey = createReactFlowFunctionKey(fnData);
        newState.functionNodes[fnReactFlowKey] = fnData;
      }

      // Create connection entry to instantiate default connection inputs
      createConnectionEntryIfNeeded(newState.dataMapConnections, fnData, fnReactFlowKey);

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
    },

    updateFunctionPosition: (state, action: PayloadAction<{ id: string; position: XYPosition }>) => {
      const newOp = { ...state.curDataMapOperation };
      const node = newOp.functionNodes[action.payload.id];
      if (!node) {
        return;
      }
      const position = node.position;
      newOp.functionNodes[action.payload.id].position = position;

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
            ...currentDataMap,
            functionNodes: newFunctionsState,
            dataMapConnections: newConnections,
            selectedItemConnectedNodes: {},
            selectedItemKey: '',
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
    changeSourceSchema: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;

      if (incomingDataMapOperation) {
        state.curDataMapOperation = incomingDataMapOperation;
        state.isDirty = true;
      }
    },
    changeTargetSchema: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;
      if (incomingDataMapOperation) {
        state.curDataMapOperation = incomingDataMapOperation;
        state.isDirty = true;
      }
    },

    setSelectedItem: (state, action: PayloadAction<string | undefined>) => {
      const connections = state.curDataMapOperation.dataMapConnections;
      const selectedItemKey = action.payload;

      state.curDataMapOperation.selectedItemKey = action.payload;

      state.curDataMapOperation.selectedItemConnectedNodes = getActiveNodes(connections, selectedItemKey);
    },
    toogleNodeExpandCollapse: (state, action: PayloadAction<ExpandCollapseAction>) => {
      const newState = { ...state.curDataMapOperation };
      const { keys, isExpanded } = action.payload;
      if (action.payload.isSourceSchema) {
        for (const key of keys) {
          newState.sourceOpenKeys[key] = isExpanded;
          if (isExpanded) {
            // If node is expanded, remove all the temporary connections created for the child
            // both from Target as well as Source schema
            const connectedTargetNodes = newState.sourceTemporaryStateConnections[key] ?? {};
            for (const targetNode of Object.keys(connectedTargetNodes)) {
              if (newState.targetTemporaryStateConnections[targetNode]) {
                delete newState.targetTemporaryStateConnections[targetNode][key];
              }
            }
            delete newState.sourceTemporaryStateConnections[key];
          } else {
            // Get all the nodes to which children are connected
            const targetConnectedChildren = Object.keys(newState.sourceParentChildEdgeMapping[key] ?? {});
            for (const child of targetConnectedChildren) {
              // Get parents of the child connected to
              const parents = newState.targetChildParentMapping[child];

              // Fetch the first parent which is collapsed
              let i = 0;
              while (i < parents.length) {
                if (!newState.targetOpenKeys[parents[i]]) {
                  break;
                }
                ++i;
              }

              // Get the node to which temporary node needs to be connected to
              let connectToChild = child;
              if (i < parents.length) {
                connectToChild = parents[i];
              }

              // Update Source-Target edge mapping
              if (!newState.sourceTemporaryStateConnections[key]) {
                newState.sourceTemporaryStateConnections[key] = {};
              }
              newState.sourceTemporaryStateConnections[key][connectToChild] = true;

              // Update Target-Source edge mapping
              if (!newState.targetTemporaryStateConnections[connectToChild]) {
                newState.targetTemporaryStateConnections[connectToChild] = {};
              }
              newState.targetTemporaryStateConnections[connectToChild][key] = true;
            }
          }
        }
      } else {
        for (const key of keys) {
          newState.targetOpenKeys[key] = isExpanded;
          if (isExpanded) {
            // If node is expanded, remove all the temporary connections created for the child
            // both from Target as well as Source schema
            const connectedSourceNodes = newState.targetTemporaryStateConnections[key] ?? {};
            for (const sourceNode of Object.keys(connectedSourceNodes)) {
              if (newState.sourceTemporaryStateConnections[sourceNode]) {
                delete newState.sourceTemporaryStateConnections[sourceNode][key];
              }
            }
            delete newState.targetTemporaryStateConnections[key];
          } else {
            // Get all the nodes to which children are connected
            const sourceConnectedChildren = Object.keys(newState.targetParentChildEdgeMapping[key] ?? {});
            for (const child of sourceConnectedChildren) {
              // Get parents of the child connected to
              const parents = newState.sourceChildParentMapping[child];

              // Fetch the first parent which is collapsed
              let i = 0;
              while (i < parents.length) {
                if (!newState.sourceOpenKeys[parents[i]]) {
                  break;
                }
                ++i;
              }

              // Get the node to which temporary node needs to be connected to
              let connectToChild = child;
              if (i < parents.length) {
                connectToChild = parents[i];
              }

              // Update Source-Target edge mapping
              if (!newState.targetTemporaryStateConnections[key]) {
                newState.targetTemporaryStateConnections[key] = {};
              }
              newState.targetTemporaryStateConnections[key][connectToChild] = true;

              // Update Target-Source edge mapping
              if (!newState.sourceTemporaryStateConnections[connectToChild]) {
                newState.sourceTemporaryStateConnections[connectToChild] = {};
              }
              newState.sourceTemporaryStateConnections[connectToChild][key] = true;
            }
          }
        }
      }

      state.curDataMapOperation = {
        ...newState,
        lastAction: 'Toggle Node Expand/Collapse',
      };
    },
  },
});

export const {
  setXsltFilename,
  setXsltContent,
  setInitialSchema,
  setInitialDataMap,
  setSelectedItem,
  changeSourceSchema,
  changeTargetSchema,
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
  toogleNodeExpandCollapse,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;

/* eslint-disable no-param-reassign */
const doDataMapOperation = (state: DataMapState, newCurrentState: DataMapOperationState, action: string) => {
  newCurrentState.lastAction = action;

  if (LogService.logToConsole) {
    console.log(`Action: ${action}`);
  }

  state.curDataMapOperation = newCurrentState;
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
    findInputSlot: nodes.specificInput === undefined, // 0 should be counted as truthy
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
  if (isFunctionData(outputNode) && outputNode?.maxNumberOfInputs === -1) {
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
