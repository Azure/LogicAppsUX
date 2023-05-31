import type { ToolboxPanelTabs } from '../../components/canvasToolbox/CanvasToolbox';
import type { NotificationData } from '../../components/notification/Notification';
import {
  deletedNotificationAutoHideDuration,
  errorNotificationAutoHideDuration,
  NotificationTypes,
} from '../../components/notification/Notification';
import type { SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../../models';
import { SchemaNodeProperty, SchemaType } from '../../models';
import type { ConnectionDictionary, ConnectionUnit, InputConnection } from '../../models/Connection';
import type { FunctionData, FunctionDictionary } from '../../models/Function';
import { directAccessPseudoFunctionKey, indexPseudoFunction } from '../../models/Function';
import { findLast } from '../../utils/Array.Utils';
import {
  applyConnectionValue,
  bringInParentSourceNodesForRepeating,
  collectSourceNodesForConnectionChain,
  collectTargetNodesForConnectionChain,
  createConnectionEntryIfNeeded,
  flattenInputs,
  generateInputHandleId,
  getConnectedSourceSchemaNodes,
  getConnectedTargetSchemaNodes,
  getFunctionConnectionUnits,
  getTargetSchemaNodeConnections,
  isConnectionUnit,
  nodeHasSpecificInputEventually,
} from '../../utils/Connection.Utils';
import {
  addAncestorNodesToCanvas,
  addNodeToCanvasIfDoesNotExist,
  addParentConnectionForRepeatingElementsNested,
  getParentId,
} from '../../utils/DataMap.Utils';
import { isFunctionData } from '../../utils/Function.Utils';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import type { ReactFlowIdParts } from '../../utils/ReactFlow.Util';
import {
  addReactFlowPrefix,
  addSourceReactFlowPrefix,
  addTargetReactFlowPrefix,
  createReactFlowFunctionKey,
  getSourceIdFromReactFlowConnectionId,
  getSplitIdsFromReactFlowConnectionId,
} from '../../utils/ReactFlow.Util';
import { flattenSchemaIntoDictionary, flattenSchemaIntoSortArray, isSchemaNodeExtended } from '../../utils/Schema.Utils';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  undoStack: DataMapOperationState[];
  redoStack: DataMapOperationState[];
  notificationData?: NotificationData;
  sourceNodeConnectionBeingDrawnFromId?: string;
  canvasToolboxTabToDisplay: ToolboxPanelTabs | '';
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
  currentFunctionNodes: FunctionDictionary;
  selectedItemKey?: string;
  selectedItemKeyParts?: ReactFlowIdParts;
  selectedItemConnectedNodes: ConnectionUnit[];
  xsltFilename: string;
  xsltContent: string;
  inlineFunctionInputOutputKeys: string[];
  lastAction: string;
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  currentSourceSchemaNodes: [],
  currentFunctionNodes: {},
  flattenedSourceSchema: {},
  sourceSchemaOrdering: [],
  flattenedTargetSchema: {},
  targetSchemaOrdering: [],
  xsltFilename: '',
  xsltContent: '',
  inlineFunctionInputOutputKeys: [],
  selectedItemConnectedNodes: [],
  lastAction: 'Pristine',
};

const initialState: DataMapState = {
  pristineDataMap: emptyPristineState,
  curDataMapOperation: emptyPristineState,
  isDirty: false,
  undoStack: [],
  redoStack: [],
  canvasToolboxTabToDisplay: '',
};

export interface InitialSchemaAction {
  schema: SchemaExtended;
  schemaType: SchemaType.Source | SchemaType.Target;
}

export interface InitialDataMapAction {
  sourceSchema: SchemaExtended;
  targetSchema: SchemaExtended;
  dataMapConnections: ConnectionDictionary;
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
      const { sourceSchema, targetSchema, dataMapConnections } = action.payload;
      const currentState = state.curDataMapOperation;

      const flattenedSourceSchema = flattenSchemaIntoDictionary(sourceSchema, SchemaType.Source);
      const sourceSchemaSortArray = flattenSchemaIntoSortArray(sourceSchema.schemaTreeRoot);
      const flattenedTargetSchema = flattenSchemaIntoDictionary(targetSchema, SchemaType.Target);
      const targetSchemaSortArray = flattenSchemaIntoSortArray(targetSchema.schemaTreeRoot);

      const newState: DataMapOperationState = {
        ...currentState,
        sourceSchema,
        targetSchema,
        flattenedSourceSchema,
        sourceSchemaOrdering: sourceSchemaSortArray,
        flattenedTargetSchema,
        targetSchemaOrdering: targetSchemaSortArray,
        dataMapConnections: dataMapConnections ?? {},
        currentSourceSchemaNodes: [],
        currentTargetSchemaNode: targetSchema.schemaTreeRoot,
      };

      state.curDataMapOperation = newState;
      state.pristineDataMap = newState;
    },

    changeSourceSchema: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;

      if (incomingDataMapOperation) {
        state.curDataMapOperation = incomingDataMapOperation;
        state.isDirty = true;
        state.undoStack = [];
        state.redoStack = [];
      }
    },

    changeTargetSchema: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;
      if (incomingDataMapOperation) {
        state.curDataMapOperation = incomingDataMapOperation;
        state.isDirty = true;
        state.undoStack = [];
        state.redoStack = [];
      }
    },

    setCurrentSourceSchemaNodes: (state, action: PayloadAction<SchemaNodeExtended[] | undefined>) => {
      let nodes: SchemaNodeExtended[] = [];
      if (action.payload) {
        const uniqueNodes = state.curDataMapOperation.currentSourceSchemaNodes.concat(action.payload).filter((node, index, self) => {
          return self.findIndex((subNode) => subNode.key === node.key) === index;
        });

        nodes = uniqueNodes;
      }

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceSchemaNodes: nodes,
      };

      doDataMapOperation(state, newState, 'Set current source schemas');
    },

    addSourceSchemaNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      const currentNodes = [...state.curDataMapOperation.currentSourceSchemaNodes];
      action.payload.forEach((payloadNode) => {
        addNodeToCanvasIfDoesNotExist(payloadNode, currentNodes);
        addAncestorNodesToCanvas(payloadNode, currentNodes, state.curDataMapOperation.flattenedSourceSchema);
      });

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceSchemaNodes: currentNodes,
      };

      doDataMapOperation(state, newState, 'Add source schema nodes');
    },

    removeSourceSchemaNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      // NOTE: So far we only ever remove one node at a time, but if that changes, we need to alter this
      // as currently each node deletion will generate a new undo/redo state
      action.payload.forEach((srcSchemaNode) => {
        deleteNodeWithKey(state, addSourceReactFlowPrefix(srcSchemaNode.key));
      });
    },

    setCurrentTargetSchemaNode: (state, action: PayloadAction<SchemaNodeExtended | undefined>) => {
      const currentTargetSchemaNode = state.curDataMapOperation.currentTargetSchemaNode;
      const newTargetSchemaNode = action.payload;

      // Remove any nodes/connection-chains that don't connect to a target schema node on the current level
      // - garbage collection for nodes that will never be displayed again

      const cleanConnections = { ...state.curDataMapOperation.dataMapConnections };

      const currentTargetSchemaNodeConnections = getTargetSchemaNodeConnections(
        currentTargetSchemaNode,
        state.curDataMapOperation.dataMapConnections
      );
      const currentFullyConnectedSourceSchemaNodes = getConnectedSourceSchemaNodes(
        currentTargetSchemaNodeConnections,
        state.curDataMapOperation.dataMapConnections
      );
      const currentFullyConnectedFunctionConnectionUnits = getFunctionConnectionUnits(
        currentTargetSchemaNodeConnections,
        state.curDataMapOperation.dataMapConnections
      );

      let wereNodesGarbageCollected = false;
      state.curDataMapOperation.currentSourceSchemaNodes.forEach((node) => {
        if (!currentFullyConnectedSourceSchemaNodes.some((fullyConnectedNode) => fullyConnectedNode.key === node.key)) {
          /* Leaving out source schema node garbage collection for now as it could be part of a full connection chain
            on a separate target schema level (thus we can't fully delete it just because it isn't connected on this current level)
          delete cleanConnections[addSourceReactFlowPrefix(node.key)];
          */

          wereNodesGarbageCollected = true;
        }
      });

      // Function nodes can be safely deleted because each node is unique, and thus can only be used on one target schema level
      Object.keys(state.curDataMapOperation.currentFunctionNodes).forEach((fnKey) => {
        if (
          !currentFullyConnectedFunctionConnectionUnits.some((fullyConnectedFnConUnit) => fullyConnectedFnConUnit.reactFlowKey === fnKey)
        ) {
          delete cleanConnections[fnKey];
          wereNodesGarbageCollected = true;
        }
      });

      if (wereNodesGarbageCollected) {
        state.notificationData = { type: NotificationTypes.ElementsAndMappingsRemoved };
      }

      // Reset currentSourceSchema/FunctionNodes, and add back any nodes part of complete connection chains on the new target schema level
      const newTargetSchemaNodeConnections = getTargetSchemaNodeConnections(newTargetSchemaNode, cleanConnections);

      // Get all the unique source nodes
      const newFullyConnectedSourceSchemaNodes = getConnectedSourceSchemaNodes(newTargetSchemaNodeConnections, cleanConnections).filter(
        (node, index, self) => {
          return self.findIndex((subNode) => subNode.key === node.key) === index;
        }
      );
      const newFullyConnectedFunctions: FunctionDictionary = {};
      getFunctionConnectionUnits(newTargetSchemaNodeConnections, cleanConnections).forEach((conUnit) => {
        newFullyConnectedFunctions[conUnit.reactFlowKey] = conUnit.node as FunctionData;
      });

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentTargetSchemaNode: newTargetSchemaNode,
        dataMapConnections: cleanConnections,
        currentSourceSchemaNodes: newFullyConnectedSourceSchemaNodes,
        currentFunctionNodes: newFullyConnectedFunctions,
      };

      doDataMapOperation(state, newState, 'Set target schema node');
    },

    setSelectedItem: (state, action: PayloadAction<string | undefined>) => {
      const connections = state.curDataMapOperation.dataMapConnections;
      const selectedItemKey = action.payload;

      state.curDataMapOperation.selectedItemKey = action.payload;

      if (selectedItemKey) {
        const selectedItemKeyParts = getSplitIdsFromReactFlowConnectionId(selectedItemKey);
        state.curDataMapOperation.selectedItemKeyParts = selectedItemKeyParts;

        const selectedItemConnectedNodes = [];
        if (connections[selectedItemKeyParts.sourceId]) {
          selectedItemConnectedNodes.push(...collectSourceNodesForConnectionChain(connections[selectedItemKeyParts.sourceId], connections));
          selectedItemConnectedNodes.push(...collectTargetNodesForConnectionChain(connections[selectedItemKeyParts.sourceId], connections));
        }

        const uniqueSelectedItemConnectedNodes = selectedItemConnectedNodes.filter((node, index, self) => {
          return self.findIndex((subNode) => subNode.reactFlowKey === node.reactFlowKey) === index;
        });

        state.curDataMapOperation.selectedItemConnectedNodes = uniqueSelectedItemConnectedNodes;
      } else {
        state.curDataMapOperation.selectedItemKeyParts = undefined;
        state.curDataMapOperation.selectedItemConnectedNodes = [];
      }
    },

    deleteCurrentlySelectedItem: (state) => {
      const selectedKey = state.curDataMapOperation.selectedItemKey;

      if (selectedKey) {
        deleteNodeWithKey(state, selectedKey);
      }
    },

    addFunctionNode: (state, action: PayloadAction<FunctionData | { functionData: FunctionData; newReactFlowKey: string }>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentFunctionNodes: { ...state.curDataMapOperation.currentFunctionNodes },
      };

      let fnReactFlowKey: string;
      let fnData: FunctionData;

      // Default - just provide the FunctionData and the key will be handled under the hood
      if (!('newReactFlowKey' in action.payload)) {
        fnData = action.payload;
        fnReactFlowKey = createReactFlowFunctionKey(fnData);
        newState.currentFunctionNodes[fnReactFlowKey] = fnData;
      } else {
        // Alternative - specify the key you want to use (needed for adding inline Functions)
        fnData = action.payload.functionData;
        fnReactFlowKey = action.payload.newReactFlowKey;
        newState.currentFunctionNodes[fnReactFlowKey] = fnData;
      }

      // Create connection entry to instantiate default connection inputs
      createConnectionEntryIfNeeded(newState.dataMapConnections, fnData, fnReactFlowKey);

      doDataMapOperation(state, newState, 'Add function node');
    },

    deleteConnection: (state, action: PayloadAction<{ inputKey: string; outputKey: string; port?: string }>) => {
      const newState = { ...state.curDataMapOperation };
      deleteConnectionFromConnections(newState.dataMapConnections, action.payload.inputKey, action.payload.outputKey, action.payload.port);

      doDataMapOperation(state, newState, 'Delete connection');
    },

    makeConnection: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      addConnection(newState.dataMapConnections, action.payload);

      // Add any repeating parent nodes as well (except for Direct Access's)
      // Get all the source nodes in case we have sources from multiple source chains
      const originalSourceNode = action.payload.source;
      let actualSources: SchemaNodeExtended[];

      if (!(isFunctionData(originalSourceNode) && originalSourceNode.key === directAccessPseudoFunctionKey)) {
        if (isFunctionData(originalSourceNode)) {
          const sourceNodes = getConnectedSourceSchemaNodes(
            [newState.dataMapConnections[action.payload.reactFlowSource]],
            newState.dataMapConnections
          );
          actualSources = sourceNodes;
        } else {
          actualSources = [originalSourceNode];
        }

        // We'll only have one output node in this case
        const originalTargetNode = action.payload.destination;
        let actualTarget: SchemaNodeExtended[];
        if (isFunctionData(originalTargetNode)) {
          const targetNodes = getConnectedTargetSchemaNodes(
            [newState.dataMapConnections[action.payload.reactFlowDestination]],
            newState.dataMapConnections
          );
          actualTarget = targetNodes;
        } else {
          actualTarget = [originalTargetNode];
        }

        actualSources.forEach((sourceNode) => {
          if (actualTarget.length > 0) {
            const wasNewArrayConnectionAdded = addParentConnectionForRepeatingElementsNested(
              sourceNode,
              actualTarget[0],
              newState.flattenedSourceSchema,
              newState.flattenedTargetSchema,
              newState.dataMapConnections
            );

            if (wasNewArrayConnectionAdded) {
              state.notificationData = { type: NotificationTypes.ArrayConnectionAdded };
            }

            // Bring in correct source nodes
            // Loop through parent nodes connected to
            const parentTargetNode = state.curDataMapOperation.currentTargetSchemaNode;
            bringInParentSourceNodesForRepeating(parentTargetNode, newState);
          }
        });
      }

      doDataMapOperation(state, newState, 'Make connection');
    },

    /* TODO: Un-deprecate / re-integrate
    // NOTE: Specifically for dragging existing connection to a new target
    changeConnection: (state, action: PayloadAction<ConnectionAction & DeleteConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      deleteConnectionFromConnections(newState.dataMapConnections, action.payload.inputKey, action.payload.connectionKey);
      addConnection(newState.dataMapConnections, action.payload);

      doDataMapOperation(state, newState);
    };
    */

    setConnectionInput: (state, action: PayloadAction<SetConnectionInputAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      applyConnectionValue(newState.dataMapConnections, action.payload);

      doDataMapOperation(state, newState, 'Set connection input value');
    },

    undoDataMapOperation: (state) => {
      const lastDataMap = state.undoStack.pop();
      if (lastDataMap && state.curDataMapOperation) {
        if (LogService.logToConsole) {
          console.log(`Undo: ${state.curDataMapOperation.lastAction}`);
        }

        state.redoStack.push(state.curDataMapOperation);
        state.curDataMapOperation = lastDataMap;
        state.isDirty = true;
      }
    },

    redoDataMapOperation: (state) => {
      const lastDataMap = state.redoStack.pop();
      if (lastDataMap && state.curDataMapOperation) {
        if (LogService.logToConsole) {
          console.log(`Redo: ${lastDataMap.lastAction}`);
        }

        state.undoStack.push(state.curDataMapOperation);
        state.curDataMapOperation = lastDataMap;
        state.isDirty = true;
      }
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

    discardDataMap: (state) => {
      state.curDataMapOperation = state.pristineDataMap;
      state.undoStack = [];
      state.redoStack = [];
      state.isDirty = false;
    },

    showNotification: (state, action: PayloadAction<NotificationData>) => {
      state.notificationData = action.payload;
    },

    hideNotification: (state) => {
      state.notificationData = undefined;
    },

    setSourceNodeConnectionBeingDrawnFromId: (state, action: PayloadAction<string | undefined>) => {
      state.sourceNodeConnectionBeingDrawnFromId = action.payload;
    },

    // Will always be either [] or [inputKey, outputKey]
    setInlineFunctionInputOutputKeys: (
      state,
      action: PayloadAction<{ inputKey: string; outputKey: string; port?: string } | undefined>
    ) => {
      const newState: DataMapOperationState = { ...state.curDataMapOperation };

      if (!action.payload) {
        newState.inlineFunctionInputOutputKeys = [];
      } else {
        newState.inlineFunctionInputOutputKeys = [action.payload.inputKey, action.payload.outputKey];
        if (action.payload.port) {
          newState.inlineFunctionInputOutputKeys.push(action.payload.port);
        }
      }

      doDataMapOperation(state, newState, 'Set inline function creation i/o keys');
    },

    setCanvasToolboxTabToDisplay: (state, action: PayloadAction<ToolboxPanelTabs | ''>) => {
      state.canvasToolboxTabToDisplay = action.payload;
    },
  },
});

export const {
  deleteConnection,
  setXsltFilename,
  setXsltContent,
  setInitialSchema,
  setInitialDataMap,
  changeSourceSchema,
  changeTargetSchema,
  setCurrentSourceSchemaNodes,
  addSourceSchemaNodes,
  removeSourceSchemaNodes,
  setCurrentTargetSchemaNode,
  setSelectedItem,
  addFunctionNode,
  makeConnection,
  setConnectionInput,
  undoDataMapOperation,
  redoDataMapOperation,
  saveDataMap,
  discardDataMap,
  deleteCurrentlySelectedItem,
  showNotification,
  hideNotification,
  setSourceNodeConnectionBeingDrawnFromId,
  setInlineFunctionInputOutputKeys,
  setCanvasToolboxTabToDisplay,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;

/* eslint-disable no-param-reassign */
const doDataMapOperation = (state: DataMapState, newCurrentState: DataMapOperationState, action: string) => {
  newCurrentState.lastAction = action;

  if (LogService.logToConsole) {
    console.log(`Action: ${action}`);
  }

  state.undoStack = state.undoStack.slice(-19);
  state.undoStack.push(state.curDataMapOperation);
  state.curDataMapOperation = newCurrentState;
  state.redoStack = [];
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
export const deleteNodeFromConnections = (connections: ConnectionDictionary, keyToDelete: string) => {
  if (connections[keyToDelete]) {
    // Step through all the connected inputs and delete the selected key from their outputs
    flattenInputs(connections[keyToDelete].inputs).forEach((input) => {
      if (isConnectionUnit(input)) {
        connections[input.reactFlowKey].outputs = connections[input.reactFlowKey].outputs.filter(
          (output) => output.reactFlowKey !== keyToDelete
        );
      }
    });

    // Step through all the outputs and delete the selected key from their inputs
    connections[keyToDelete].outputs.forEach((outputConnection) => {
      Object.values(connections[outputConnection.reactFlowKey].inputs).forEach((outputConnectionInput, index) => {
        connections[outputConnection.reactFlowKey].inputs[index] = outputConnectionInput.filter((input) =>
          isConnectionUnit(input) ? input.reactFlowKey !== keyToDelete : true
        );
      });
    });
  }

  delete connections[keyToDelete];
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
  if (parentId.endsWith(SchemaType.Source + '-')) {
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

export const deleteNodeWithKey = (curDataMapState: DataMapState, reactFlowKey: string) => {
  const targetNode = curDataMapState.curDataMapOperation.flattenedTargetSchema[reactFlowKey];
  if (targetNode) {
    curDataMapState.notificationData = {
      type: NotificationTypes.TargetNodeCannotDelete,
      autoHideDurationMs: errorNotificationAutoHideDuration,
    };
    return;
  }

  // Handle deleting source schema node
  const sourceNode = curDataMapState.curDataMapOperation.flattenedSourceSchema[reactFlowKey];
  if (sourceNode) {
    // Check if it has outputs *on the current canvas level* - if so, cancel it and show notification
    const potentialSrcSchemaNodeConnection = curDataMapState.curDataMapOperation.dataMapConnections[reactFlowKey];
    if (potentialSrcSchemaNodeConnection && potentialSrcSchemaNodeConnection.outputs.length > 0) {
      // Check that there's no outputs on the current canvas level by checking for outputs in current function and target schema nodes
      const hasOutputsOnCurrentCanvasLevel = potentialSrcSchemaNodeConnection.outputs.some((output) => {
        const potentialConnectedFnNode = curDataMapState.curDataMapOperation.currentFunctionNodes[output.reactFlowKey];
        const potentialConnectedTargetNode = curDataMapState.curDataMapOperation.currentTargetSchemaNode;

        if (potentialConnectedFnNode) {
          return true;
        }

        // Check if currentTargetSchemaNode or any of its children matches an output
        if (
          potentialConnectedTargetNode &&
          (addTargetReactFlowPrefix(potentialConnectedTargetNode.key) === output.reactFlowKey ||
            potentialConnectedTargetNode.children.some((child) => addTargetReactFlowPrefix(child.key) === output.reactFlowKey))
        ) {
          return true;
        }

        return false;
      });

      if (hasOutputsOnCurrentCanvasLevel) {
        curDataMapState.notificationData = {
          type: NotificationTypes.SourceNodeRemoveFailed,
          msgParam: sourceNode.name,
          autoHideDurationMs: errorNotificationAutoHideDuration,
        };
        return;
      }
    }

    const filteredCurrentSrcSchemaNodes = curDataMapState.curDataMapOperation.currentSourceSchemaNodes.filter(
      (node) => node.key !== sourceNode.key
    );

    // NOTE: Do NOT delete source schema node from connections - at this stage, it's not guaranteed that
    // there are no connections to it, and we don't want to accidentally delete connections on other layers
    curDataMapState.curDataMapOperation.selectedItemKey = undefined;
    curDataMapState.curDataMapOperation.selectedItemKeyParts = undefined;
    curDataMapState.curDataMapOperation.selectedItemConnectedNodes = [];

    doDataMapOperation(
      curDataMapState,
      {
        ...curDataMapState.curDataMapOperation,
        currentSourceSchemaNodes: filteredCurrentSrcSchemaNodes,
      },
      'Delete schema node by key'
    );
    curDataMapState.notificationData = {
      type: NotificationTypes.SourceNodeRemoved,
      autoHideDurationMs: deletedNotificationAutoHideDuration,
    };
    return;
  }

  // Handle deleting function node
  const functionNode = curDataMapState.curDataMapOperation.currentFunctionNodes[reactFlowKey];
  if (functionNode) {
    const newFunctionsState = { ...curDataMapState.curDataMapOperation.currentFunctionNodes };
    delete newFunctionsState[reactFlowKey];

    deleteNodeFromConnections(curDataMapState.curDataMapOperation.dataMapConnections, reactFlowKey);

    curDataMapState.curDataMapOperation.selectedItemKey = undefined;
    curDataMapState.curDataMapOperation.selectedItemKeyParts = undefined;
    curDataMapState.curDataMapOperation.selectedItemConnectedNodes = [];

    doDataMapOperation(
      curDataMapState,
      { ...curDataMapState.curDataMapOperation, currentFunctionNodes: newFunctionsState },
      'Delete function by key'
    );

    curDataMapState.notificationData = {
      type: NotificationTypes.FunctionNodeDeleted,
      autoHideDurationMs: deletedNotificationAutoHideDuration,
    };

    return;
  }

  // Item to be deleted is a connection
  const connections = { ...curDataMapState.curDataMapOperation.dataMapConnections };

  const splitIds = getSplitIdsFromReactFlowConnectionId(reactFlowKey);
  if (splitIds.destinationId) {
    deleteConnectionFromConnections(connections, splitIds.sourceId, splitIds.destinationId, splitIds.portId);
  } else {
    LogService.error(LogCategory.DataMapSlice, 'deleteNodeWithKey', {
      message: 'Missing destination id',
    });
  }

  const tempConn = connections[getSourceIdFromReactFlowConnectionId(reactFlowKey)];
  const ids = getConnectedSourceSchemaNodes([tempConn], connections);
  if (ids.length > 0) {
    deleteParentRepeatingConnections(connections, addSourceReactFlowPrefix(ids[0].key));
  }

  doDataMapOperation(
    curDataMapState,
    {
      ...curDataMapState.curDataMapOperation,
      dataMapConnections: { ...connections },
    },
    'Delete connection'
  );

  curDataMapState.notificationData = {
    type: NotificationTypes.ConnectionDeleted,
    autoHideDurationMs: deletedNotificationAutoHideDuration,
  };
};

export const addParentConnectionForRepeatingElements = (
  targetNode: FunctionData | SchemaNodeExtended,
  sourceNode: FunctionData | SchemaNodeExtended,
  flattenedSourceSchema: SchemaNodeDictionary,
  flattenedTargetSchema: SchemaNodeDictionary,
  dataMapConnections: ConnectionDictionary,
  indexFnRfKey: string | undefined // For deserialization
) => {
  if (isSchemaNodeExtended(sourceNode) && isSchemaNodeExtended(targetNode)) {
    if (sourceNode.parentKey) {
      const firstTargetNodeWithRepeatingPathItem = findLast(targetNode.pathToRoot, (pathItem) => pathItem.repeating);

      const parentSourceNode = flattenedSourceSchema[addReactFlowPrefix(sourceNode.parentKey, SchemaType.Source)];
      const firstSourceNodeWithRepeatingPathItem = findLast(parentSourceNode.pathToRoot, (pathItem) => pathItem.repeating);

      if (
        (firstSourceNodeWithRepeatingPathItem || indexFnRfKey || sourceNode.nodeProperties.includes(SchemaNodeProperty.Repeating)) &&
        firstTargetNodeWithRepeatingPathItem
      ) {
        // If adding an index() too, our sourceNode will already be the parent we want
        const parentSourceNode =
          indexFnRfKey || sourceNode.nodeProperties.includes(SchemaNodeProperty.Repeating) || !firstSourceNodeWithRepeatingPathItem
            ? sourceNode
            : flattenedSourceSchema[addReactFlowPrefix(firstSourceNodeWithRepeatingPathItem.key, SchemaType.Source)];
        const parentPrefixedSourceKey = addReactFlowPrefix(parentSourceNode.key, SchemaType.Source);

        const parentPrefixedTargetKey = addReactFlowPrefix(firstTargetNodeWithRepeatingPathItem.key, SchemaType.Target);
        const parentTargetNode = flattenedTargetSchema[parentPrefixedTargetKey];

        const parentsAlreadyConnected = nodeHasSpecificInputEventually(
          parentPrefixedSourceKey,
          dataMapConnections[parentPrefixedTargetKey],
          dataMapConnections,
          true
        );

        if (!parentsAlreadyConnected) {
          if (!indexFnRfKey) {
            applyConnectionValue(dataMapConnections, {
              targetNode: parentTargetNode,
              targetNodeReactFlowKey: parentPrefixedTargetKey,
              findInputSlot: true,
              input: {
                reactFlowKey: parentPrefixedSourceKey,
                node: parentSourceNode,
              },
            });
          } else {
            // If provided, we need to plug in an index() between the parent loop elements
            // Source schema node -> Index()
            applyConnectionValue(dataMapConnections, {
              targetNode: indexPseudoFunction,
              targetNodeReactFlowKey: indexFnRfKey,
              findInputSlot: true,
              input: {
                reactFlowKey: parentPrefixedSourceKey,
                node: parentSourceNode,
              },
            });

            // Index() -> target schema node
            applyConnectionValue(dataMapConnections, {
              targetNode: parentTargetNode,
              targetNodeReactFlowKey: parentPrefixedTargetKey,
              findInputSlot: true,
              input: {
                reactFlowKey: indexFnRfKey,
                node: indexPseudoFunction,
              },
            });
          }
        }
      }
    }
  }
};
