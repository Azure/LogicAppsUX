import type { ConnectionDictionary, ConnectionUnit, InputConnection } from '../../models/Connection';
import { directAccessPseudoFunctionKey, type FunctionData, type FunctionDictionary } from '../../models/Function';
import {
  applyConnectionValue,
  bringInParentSourceNodesForRepeating,
  flattenInputs,
  generateInputHandleId,
  getConnectedSourceSchemaNodes,
  getConnectedTargetSchemaNodes,
  isConnectionUnit,
} from '../../utils/Connection.Utils';
import type { UnknownNode } from '../../utils/DataMap.Utils';
import { getParentId } from '../../utils/DataMap.Utils';
import { getConnectedSourceSchema, getFunctionLocationsForAllFunctions, isFunctionData } from '../../utils/Function.Utils';
import { LogService } from '../../utils/Logging.Utils';
import { flattenSchemaIntoDictionary, flattenSchemaIntoSortArray, isSchemaNodeExtended } from '../../utils/Schema.Utils';
import type { FunctionMetadata, MapMetadata, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { convertConnectionShorthandToId, generateFunctionConnectionMetadata } from '../../mapHandling/MapMetadataSerializer';
import type { Node, Edge } from 'reactflow';

export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  sourceNodeConnectionBeingDrawnFromId?: string;
}

export interface DataMapOperationState {
  dataMapConnections: ConnectionDictionary;
  sourceSchema?: SchemaExtended;
  flattenedSourceSchema: SchemaNodeDictionary;
  sourceSchemaOrdering: string[];
  targetSchema?: SchemaExtended;
  flattenedTargetSchema: SchemaNodeDictionary;
  targetSchemaOrdering: string[];
  currentSourceSchemaNodes: SchemaNodeExtended[];
  currentTargetSchemaNode?: SchemaNodeExtended;
  functionNodes: FunctionDictionary;
  selectedItemKey?: string;
  selectedItemConnectedNodes: ConnectionUnit[];
  xsltFilename: string;
  xsltContent: string;
  inlineFunctionInputOutputKeys: string[];
  lastAction: string;
  loadedMapMetadata?: MapMetadata;
  nodes: Node[];
  edges: Edge[];
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  currentSourceSchemaNodes: [],
  functionNodes: {},
  flattenedSourceSchema: {},
  sourceSchemaOrdering: [],
  flattenedTargetSchema: {},
  targetSchemaOrdering: [],
  xsltFilename: '',
  xsltContent: '',
  inlineFunctionInputOutputKeys: [],
  selectedItemConnectedNodes: [],
  lastAction: 'Pristine',
  nodes: [],
  edges: [],
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
  metadata: MapMetadata | undefined;
}

export interface ReactFlowNodeAction {
  node: Node;
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

      if (action.payload.schemaType === SchemaType.Source) {
        const sourceSchemaSortArray = flattenSchemaIntoSortArray(action.payload.schema.schemaTreeRoot);

        state.curDataMapOperation.sourceSchema = action.payload.schema;
        state.curDataMapOperation.flattenedSourceSchema = flattenedSchema;
        state.curDataMapOperation.sourceSchemaOrdering = sourceSchemaSortArray;
        state.pristineDataMap.sourceSchema = action.payload.schema;
        state.pristineDataMap.flattenedSourceSchema = flattenedSchema;
        state.pristineDataMap.sourceSchemaOrdering = sourceSchemaSortArray;
      } else {
        const targetSchemaSortArray = flattenSchemaIntoSortArray(action.payload.schema.schemaTreeRoot);

        state.curDataMapOperation.targetSchema = action.payload.schema;
        state.curDataMapOperation.flattenedTargetSchema = flattenedSchema;
        state.curDataMapOperation.targetSchemaOrdering = targetSchemaSortArray;
        state.curDataMapOperation.currentTargetSchemaNode = undefined;
        state.pristineDataMap.targetSchema = action.payload.schema;
        state.pristineDataMap.flattenedTargetSchema = flattenedSchema;
        state.pristineDataMap.targetSchemaOrdering = targetSchemaSortArray;
      }

      if (state.curDataMapOperation.sourceSchema && state.curDataMapOperation.targetSchema) {
        state.curDataMapOperation.currentTargetSchemaNode = state.curDataMapOperation.targetSchema.schemaTreeRoot;
      }
    },

    setInitialDataMap: (state, action: PayloadAction<InitialDataMapAction>) => {
      const { sourceSchema, targetSchema, dataMapConnections, metadata } = action.payload;
      const currentState = state.curDataMapOperation;
      const flattenedSourceSchema = flattenSchemaIntoDictionary(sourceSchema, SchemaType.Source);
      const sourceSchemaSortArray = flattenSchemaIntoSortArray(sourceSchema.schemaTreeRoot);
      const flattenedTargetSchema = flattenSchemaIntoDictionary(targetSchema, SchemaType.Target);
      const targetSchemaSortArray = flattenSchemaIntoSortArray(targetSchema.schemaTreeRoot);

      let functionNodes: FunctionDictionary = getFunctionLocationsForAllFunctions(dataMapConnections, flattenedTargetSchema);
      functionNodes = assignFunctionNodePositionsFromMetadata(dataMapConnections, metadata?.functionNodes || [], functionNodes) || {};
      const connectedFlattenedSourceSchema = getConnectedSourceSchema(dataMapConnections, flattenedSourceSchema);

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
        currentSourceSchemaNodes: Object.values(connectedFlattenedSourceSchema),
        currentTargetSchemaNode: targetSchema.schemaTreeRoot,
        loadedMapMetadata: metadata,
      };

      state.curDataMapOperation = newState;
      state.pristineDataMap = newState;
    },

    makeConnection: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
        functionNodes: { ...state.curDataMapOperation.functionNodes },
      };

      let sourceNode: UnknownNode;

      if (action.payload.reactFlowSource.startsWith(SchemaType.Source)) {
        sourceNode = state.curDataMapOperation.flattenedSourceSchema[action.payload.reactFlowSource];
      } else {
        sourceNode = newState.functionNodes[action.payload.reactFlowSource].functionData;
      }
      let destinationNode: UnknownNode;

      if (action.payload.reactFlowDestination.startsWith(SchemaType.Target)) {
        destinationNode = state.curDataMapOperation.flattenedTargetSchema[action.payload.reactFlowDestination];
      } else {
        destinationNode = newState.functionNodes[action.payload.reactFlowSource].functionData;
      }

      addConnection(newState.dataMapConnections, action.payload, destinationNode, sourceNode);

      if (isFunctionData(sourceNode)) {
        updateFunctionNodeLocations(newState, action.payload.reactFlowSource);
        doDataMapOperation(state, newState, 'Updated function node locations by adding');
      }

      handleDirectAccessConnection(sourceNode, action.payload, newState, destinationNode);

      doDataMapOperation(state, newState, 'Make connection');
    },

    saveDataMap: (
      state,
      action: PayloadAction<{ sourceSchemaExtended: SchemaExtended | undefined; targetSchemaExtended: SchemaExtended | undefined }>
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

    updateReactFlowNode: (state, action: PayloadAction<ReactFlowNodeAction>) => {
      const currentState = state.curDataMapOperation;
      const { nodes } = currentState;
      const newNode = action.payload.node;
      const oldNode = nodes.find((node) => node.id === newNode.id);
      let updatedNodes = [];
      if (action.payload.removeNode) {
        updatedNodes = oldNode ? nodes.filter((node) => node.id !== newNode.id) : nodes;
      } else if (oldNode) {
        updatedNodes = nodes.map((node) => {
          if (node.id === newNode.id) {
            return newNode;
          }
          return node;
        });
      } else {
        updatedNodes = [...nodes, newNode];
      }

      const newState = {
        ...currentState,
        nodes: updatedNodes,
      };

      state.curDataMapOperation = newState;
    },
    updateReactFlowEdges: (state, action: PayloadAction<Edge[]>) => {
      const currentState = state.curDataMapOperation;
      const newState = {
        ...currentState,
        edges: action.payload,
      };

      state.curDataMapOperation = newState;
    },
    updateReactFlowNodes: (state, action: PayloadAction<Node[]>) => {
      const currentState = state.curDataMapOperation;
      const newState = {
        ...currentState,
        nodes: action.payload,
      };

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
  },
});

export const {
  setXsltFilename,
  setXsltContent,
  setInitialSchema,
  setInitialDataMap,
  changeSourceSchema,
  changeTargetSchema,
  updateReactFlowNode,
  updateReactFlowEdges,
  updateReactFlowNodes,
  makeConnection,
  saveDataMap,
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
  if (isFunctionData(outputNode) && outputNode.maxNumberOfInputs === -1) {
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

export const updateFunctionNodeLocations = (newState: DataMapOperationState, functionKey: string) => {
  const connection = newState.dataMapConnections[functionKey];
  const targetNodes = getConnectedTargetSchemaNodes([connection], newState.dataMapConnections);
  const functionNode = newState.functionNodes[functionKey];
  targetNodes.forEach((targetNode) => {
    functionNode.functionLocations.push(targetNode);

    const uniqueLocations = functionNode.functionLocations.filter((location, index, self) => {
      return self.findIndex((subLocation) => subLocation.key === location.key) === index;
    });

    functionNode.functionLocations = uniqueLocations;
  });
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

        // Bring in correct source nodes
        // Loop through parent nodes connected to
        const parentTargetNode = newState.currentTargetSchemaNode;
        bringInParentSourceNodesForRepeating(parentTargetNode, newState);
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
    functions[key].functionData = {
      ...functions[key].functionData,
      positions: matchingMetadata?.positions,
    };
  });
  return functions;
};
