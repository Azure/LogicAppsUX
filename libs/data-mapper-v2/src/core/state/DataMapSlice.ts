/* eslint-disable @typescript-eslint/no-unused-vars */
// import type { ToolboxPanelTabs } from '../../components/canvasToolbox/CanvasToolbox';
// import type { NotificationData } from '../../components/notification/Notification';
// import {
//   deletedNotificationAutoHideDuration,
//   errorNotificationAutoHideDuration,
//   NotificationTypes,
// } from '../../components/notification/Notification';
//import { convertConnectionShorthandToId, generateFunctionConnectionMetadata } from '../../mapDefinitions';
import type { ConnectionDictionary, ConnectionUnit, InputConnection } from '../../models/Connection';
import type { FunctionData, FunctionDictionary } from '../../models/Function';
import {
  applyConnectionValue,
  flattenInputs,
  generateInputHandleId,
  getConnectedTargetSchemaNodes,
  isConnectionUnit,
} from '../../utils/Connection.Utils';
import {
  //addParentConnectionForRepeatingElementsNested,
  getParentId,
} from '../../utils/DataMap.Utils';
import { getConnectedSourceSchema, getFunctionLocationsForAllFunctions, isFunctionData } from '../../utils/Function.Utils';
import { LogService } from '../../utils/Logging.Utils';
// import type { ReactFlowIdParts } from '../../utils/ReactFlow.Util';
// import {
//   addReactFlowPrefix,
//   addSourceReactFlowPrefix,
//   addTargetReactFlowPrefix,
//   createReactFlowFunctionKey,
//   getSourceIdFromReactFlowConnectionId,
//   getSplitIdsFromReactFlowConnectionId,
// } from '../../utils/ReactFlow.Util';
import { flattenSchemaIntoDictionary, flattenSchemaIntoSortArray, isSchemaNodeExtended } from '../../utils/Schema.Utils';
import type { FunctionMetadata, MapMetadata, SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { SchemaNodeProperty, SchemaType } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { convertConnectionShorthandToId, generateFunctionConnectionMetadata } from '../../mapHandling/MapMetadataSerializer';
import type { Node, Edge } from 'reactflow';
// danielle strip this

export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  // notificationData?: NotificationData;
  sourceNodeConnectionBeingDrawnFromId?: string;
  // canvasToolboxTabToDisplay: ToolboxPanelTabs | '';
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
  // selectedItemKeyParts?: ReactFlowIdParts;
  selectedItemConnectedNodes: ConnectionUnit[];
  xsltFilename: string;
  xsltContent: string;
  inlineFunctionInputOutputKeys: string[];
  lastAction: string;
  loadedMapMetadata?: MapMetadata;
  sourceNodes: Node[];
  targetNodes: Node[];
  sourceEdges: Edge[];
  targetEdges: Edge[];
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
  sourceNodes: [],
  targetNodes: [],
  sourceEdges: [],
  targetEdges: [],
};

const initialState: DataMapState = {
  pristineDataMap: emptyPristineState,
  curDataMapOperation: emptyPristineState,
  isDirty: false,
  // canvasToolboxTabToDisplay: '',
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
  isSourceNode: boolean;
  removeNode?: boolean;
}

export interface ConnectionAction {
  source: SchemaNodeExtended | FunctionData;
  destination: SchemaNodeExtended | FunctionData;
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
    updateReactFlowNode: (state, action: PayloadAction<ReactFlowNodeAction>) => {
      const currentState = state.curDataMapOperation;
      const { sourceNodes, targetNodes } = currentState;
      const isSourceNode = action.payload.isSourceNode;

      const updateNodes = (nodes: Node[]) => {
        const newNode = action.payload.node;
        const oldNode = nodes.find((node) => node.id === newNode.id);
        if (action.payload.removeNode) {
          return oldNode ? nodes.filter((node) => node.id !== newNode.id) : nodes;
        }
        if (oldNode) {
          return nodes.map((node) => {
            if (node.id === newNode.id) {
              return newNode;
            }
            return node;
          });
        }
        nodes.push(newNode);
        return nodes;
      };

      const newState = {
        ...currentState,
        sourceNodes: isSourceNode ? updateNodes([...sourceNodes]) : sourceNodes,
        targetNodes: isSourceNode ? targetNodes : updateNodes([...targetNodes]),
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

const addConnection = (newConnections: ConnectionDictionary, nodes: ConnectionAction): void => {
  applyConnectionValue(newConnections, {
    targetNode: nodes.destination,
    targetNodeReactFlowKey: nodes.reactFlowDestination,
    findInputSlot: nodes.specificInput === undefined, // 0 should be counted as truthy
    inputIndex: nodes.specificInput,
    input: {
      reactFlowKey: nodes.reactFlowSource,
      node: nodes.source,
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
