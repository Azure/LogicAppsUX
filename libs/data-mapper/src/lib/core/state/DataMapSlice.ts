import type { ToolboxPanelTabs } from '../../components/canvasToolbox/CanvasToolbox';
import type { NotificationData } from '../../components/notification/Notification';
import {
  deletedNotificationAutoHideDuration,
  NotificationTypes,
  errorNotificationAutoHideDuration,
} from '../../components/notification/Notification';
import type { SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../../models';
import { SchemaNodeProperty, SchemaType } from '../../models';
import type { ConnectionDictionary, InputConnection } from '../../models/Connection';
import type { FunctionData, FunctionDictionary } from '../../models/Function';
import { findLast } from '../../utils/Array.Utils';
import {
  addNodeToConnections,
  bringInParentSourceNodesForRepeating,
  createConnectionEntryIfNeeded,
  flattenInputs,
  getConnectedSourceSchemaNodes,
  getFunctionConnectionUnits,
  getTargetSchemaNodeConnections,
  isConnectionUnit,
  nodeHasSpecificInputEventually,
  updateConnectionInputValue,
} from '../../utils/Connection.Utils';
import { addParentConnectionForRepeatingElementsNested } from '../../utils/DataMap.Utils';
import {
  addReactFlowPrefix,
  addSourceReactFlowPrefix,
  createReactFlowFunctionKey,
  getDestinationIdFromReactFlowConnectionId,
  getSourceIdFromReactFlowConnectionId,
} from '../../utils/ReactFlow.Util';
import { flattenSchema, isSchemaNodeExtended } from '../../utils/Schema.Utils';
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
  targetSchema?: SchemaExtended;
  flattenedTargetSchema: SchemaNodeDictionary;
  currentSourceSchemaNodes: SchemaNodeExtended[];
  currentTargetSchemaNode?: SchemaNodeExtended;
  currentFunctionNodes: FunctionDictionary;
  selectedItemKey?: string;
  xsltFilename: string;
  inlineFunctionInputOutputKeys: string[];
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  currentSourceSchemaNodes: [],
  currentFunctionNodes: {},
  flattenedSourceSchema: {},
  flattenedTargetSchema: {},
  xsltFilename: '',
  inlineFunctionInputOutputKeys: [],
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
}

export interface UpdateConnectionInputAction {
  targetNode: SchemaNodeExtended | FunctionData;
  targetNodeReactFlowKey: string;
  inputIndex: number;
  value: InputConnection | null; // null is indicator to remove an unbounded input value
  // If true, inputIndex becomes the value's index within inputs[0] (instead of inputs[inputIndex])
  isUnboundedInput?: boolean;
}

export interface DeleteConnectionAction {
  connectionKey: string;
  inputKey: string;
}

// TODO: Go through and clean-up duplicate and un-used actions/reducers

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    setXsltFilename: (state, action: PayloadAction<string>) => {
      state.curDataMapOperation.xsltFilename = action.payload;
      state.pristineDataMap.xsltFilename = action.payload;
    },

    setInitialSchema: (state, action: PayloadAction<InitialSchemaAction>) => {
      const flattenedSchema = flattenSchema(action.payload.schema, action.payload.schemaType);

      if (action.payload.schemaType === SchemaType.Source) {
        state.curDataMapOperation.sourceSchema = action.payload.schema;
        state.curDataMapOperation.flattenedSourceSchema = flattenedSchema;
        state.pristineDataMap.sourceSchema = action.payload.schema;
        state.pristineDataMap.flattenedSourceSchema = flattenedSchema;
      } else {
        state.curDataMapOperation.targetSchema = action.payload.schema;
        state.curDataMapOperation.flattenedTargetSchema = flattenedSchema;
        state.pristineDataMap.targetSchema = action.payload.schema;
        state.pristineDataMap.flattenedTargetSchema = flattenedSchema;
      }
    },

    setInitialDataMap: (state, action: PayloadAction<InitialDataMapAction>) => {
      const { sourceSchema, targetSchema, dataMapConnections } = action.payload;
      const currentState = state.curDataMapOperation;

      const flattenedSourceSchema = flattenSchema(sourceSchema, SchemaType.Source);
      const flattenedTargetSchema = flattenSchema(targetSchema, SchemaType.Target);

      const newState: DataMapOperationState = {
        ...currentState,
        sourceSchema,
        targetSchema,
        flattenedSourceSchema,
        flattenedTargetSchema,
        dataMapConnections: dataMapConnections ?? {},
        currentSourceSchemaNodes: [],
        currentTargetSchemaNode: undefined,
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

      doDataMapOperation(state, newState);
    },

    addSourceSchemaNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      const nodes = [...state.curDataMapOperation.currentSourceSchemaNodes];
      action.payload.forEach((payloadNode) => {
        const existingNode = state.curDataMapOperation.currentSourceSchemaNodes.find((currentNode) => currentNode.key === payloadNode.key);
        if (!existingNode) {
          nodes.push(payloadNode);
        }
      });

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceSchemaNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },
    removeSourceSchemaNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      // TODO: So far we only ever remove one node at a time, but if that changes, we need to alter this
      // as currently each node deletion will generate a new undo/redo state
      action.payload.forEach((srcSchemaNode) => {
        deleteNodeWithKey(state, addSourceReactFlowPrefix(srcSchemaNode.key));
      });
    },

    toggleSourceSchemaNode: (state, action: PayloadAction<SchemaNodeExtended>) => {
      let nodes = [...state.curDataMapOperation.currentSourceSchemaNodes];
      const existingNode = state.curDataMapOperation.currentSourceSchemaNodes.find((currentNode) => currentNode.key === action.payload.key);
      if (existingNode) {
        nodes = state.curDataMapOperation.currentSourceSchemaNodes.filter((currentNode) => currentNode.key !== action.payload.key);
      } else {
        nodes.push(action.payload);
      }

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceSchemaNodes: nodes,
      };

      doDataMapOperation(state, newState);
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

      doDataMapOperation(state, newState);
    },

    setSelectedItem: (state, action: PayloadAction<string | undefined>) => {
      state.curDataMapOperation.selectedItemKey = action.payload;
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

      doDataMapOperation(state, newState);
    },

    makeConnection: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      addConnection(newState.dataMapConnections, action.payload);

      // Add any repeating parent nodes as well
      const sourceNode = action.payload.source;
      addParentConnectionForRepeatingElementsNested(
        sourceNode,
        action.payload.destination,
        newState.flattenedSourceSchema,
        newState.flattenedTargetSchema,
        newState.dataMapConnections
      );

      // if new parent connection has been made
      if (Object.keys(newState.dataMapConnections).length !== Object.keys(state.curDataMapOperation.dataMapConnections).length) {
        state.notificationData = { type: NotificationTypes.ArrayConnectionAdded };
      }

      // bring in correct source nodes
      // loop through parent nodes connected to
      const parentTargetNode = state.curDataMapOperation.currentTargetSchemaNode;
      bringInParentSourceNodesForRepeating(parentTargetNode, newState);

      doDataMapOperation(state, newState);
    },

    /* DEPRECATED: Will be removed in the near future once it's certain it won't be used again elsewhere
    // NOTE: Specifically for dragging existing connection to a new target
    changeConnection: (state, action: PayloadAction<ConnectionAction & DeleteConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      deleteConnectionFromConnections(newState.dataMapConnections, action.payload.inputKey, action.payload.connectionKey);
      addConnection(newState.dataMapConnections, action.payload);

      doDataMapOperation(state, newState);
    },
    */

    updateConnectionInput: (state, action: PayloadAction<UpdateConnectionInputAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      updateConnectionInputValue(newState.dataMapConnections, action.payload);

      doDataMapOperation(state, newState);
    },

    /* DEPRECATED: Will be removed in the near future once it's certain it won't be used again elsewhere
    deleteConnection: (state, action: PayloadAction<DeleteConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      deleteConnectionFromConnections(newState.dataMapConnections, action.payload.inputKey, action.payload.connectionKey);

      doDataMapOperation(state, newState);
      state.notificationData = { type: NotificationTypes.ConnectionDeleted, autoHideDurationMs: deletedNotificationAutoHideDuration };
    },
    */

    undoDataMapOperation: (state) => {
      const lastDataMap = state.undoStack.pop();
      if (lastDataMap && state.curDataMapOperation) {
        state.redoStack.push(state.curDataMapOperation);
        state.curDataMapOperation = lastDataMap;
        state.isDirty = true;
      }
    },

    redoDataMapOperation: (state) => {
      const lastDataMap = state.redoStack.pop();
      if (lastDataMap && state.curDataMapOperation) {
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
    setInlineFunctionInputOutputKeys: (state, action: PayloadAction<{ inputKey: string; outputKey: string } | undefined>) => {
      const newState: DataMapOperationState = { ...state.curDataMapOperation };

      if (!action.payload) {
        newState.inlineFunctionInputOutputKeys = [];
      } else {
        newState.inlineFunctionInputOutputKeys = [action.payload.inputKey, action.payload.outputKey];
      }

      doDataMapOperation(state, newState);
    },

    setCanvasToolboxTabToDisplay: (state, action: PayloadAction<ToolboxPanelTabs | ''>) => {
      state.canvasToolboxTabToDisplay = action.payload;
    },
  },
});

export const {
  setXsltFilename,
  setInitialSchema,
  setInitialDataMap,
  changeSourceSchema,
  changeTargetSchema,
  setCurrentSourceSchemaNodes,
  addSourceSchemaNodes,
  removeSourceSchemaNodes,
  toggleSourceSchemaNode,
  setCurrentTargetSchemaNode,
  setSelectedItem,
  addFunctionNode,
  makeConnection,
  updateConnectionInput,
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
const doDataMapOperation = (state: DataMapState, newCurrentState: DataMapOperationState) => {
  state.undoStack = state.undoStack.slice(-19);
  state.undoStack.push(state.curDataMapOperation);
  state.curDataMapOperation = newCurrentState;
  state.redoStack = [];
  state.isDirty = true;
};

const addConnection = (newConnections: ConnectionDictionary, nodes: ConnectionAction): void => {
  createConnectionEntryIfNeeded(newConnections, nodes.destination, nodes.reactFlowDestination);
  addNodeToConnections(newConnections, nodes.source, nodes.reactFlowSource, nodes.destination, nodes.reactFlowDestination);
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

export const deleteConnectionFromConnections = (connections: ConnectionDictionary, inputKey: string, outputKey: string) => {
  connections[inputKey].outputs = connections[inputKey].outputs.filter((output) => output.reactFlowKey !== outputKey);

  Object.entries(connections[outputKey].inputs).forEach(
    ([key, input]) =>
      (connections[outputKey].inputs[key] = input.filter((inputEntry) =>
        isConnectionUnit(inputEntry) ? inputEntry.reactFlowKey !== inputKey : true
      ))
  );
};

export const canDeleteConnection = (
  connections: ConnectionDictionary,
  sourceNodeId: string,
  targetNodeId: string,
  sourceSchema: SchemaNodeDictionary,
  _targetSchema: SchemaNodeDictionary
) => {
  const sourceNode = sourceSchema[sourceNodeId];
  if (sourceNode) {
    // if connection source is not repeating, can delete
    if (!sourceNode.nodeProperties.includes(SchemaNodeProperty.Repeating)) {
      return true;
    } else {
      // source node is repeating
      // if child is connected, and connection is completed
    }
  }
  return false;
};

export const parentHasChildConnection = (connections: ConnectionDictionary, nodeKey: string) => {
  const node = connections[nodeKey].self.node as SchemaNodeExtended;
  if (!node.nodeProperties.includes(SchemaNodeProperty.Repeating)) {
    // node not repeating, and has connection? or connection to end
    if (connections) {
      console.log(connections);
    }
  }
  //const children = node.children;
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
    // Check if it has outputs - if so, cancel it and show notification
    const potentialSrcSchemaNodeConnection = curDataMapState.curDataMapOperation.dataMapConnections[reactFlowKey];
    if (potentialSrcSchemaNodeConnection && potentialSrcSchemaNodeConnection.outputs.length > 0) {
      curDataMapState.notificationData = {
        type: NotificationTypes.SourceNodeRemoveFailed,
        msgParam: sourceNode.name,
        autoHideDurationMs: errorNotificationAutoHideDuration,
      };
      return;
    }

    const filteredCurrentSrcSchemaNodes = curDataMapState.curDataMapOperation.currentSourceSchemaNodes.filter(
      (node) => node.key !== sourceNode.key
    );
    deleteNodeFromConnections(curDataMapState.curDataMapOperation.dataMapConnections, reactFlowKey);

    curDataMapState.curDataMapOperation.selectedItemKey = undefined;
    doDataMapOperation(curDataMapState, {
      ...curDataMapState.curDataMapOperation,
      currentSourceSchemaNodes: filteredCurrentSrcSchemaNodes,
    });
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
    doDataMapOperation(curDataMapState, { ...curDataMapState.curDataMapOperation, currentFunctionNodes: newFunctionsState });
    curDataMapState.notificationData = {
      type: NotificationTypes.FunctionNodeDeleted,
      autoHideDurationMs: deletedNotificationAutoHideDuration,
    };
    return;
  }

  // item to be deleted is a connection
  const sourceId = getSourceIdFromReactFlowConnectionId(reactFlowKey);
  const targetId = getDestinationIdFromReactFlowConnectionId(reactFlowKey);
  const canDelete = canDeleteConnection(
    curDataMapState.curDataMapOperation.dataMapConnections,
    sourceId,
    targetId,
    curDataMapState.curDataMapOperation.flattenedSourceSchema,
    curDataMapState.curDataMapOperation.flattenedTargetSchema
  );
  console.log(canDelete);

  deleteConnectionFromConnections(
    curDataMapState.curDataMapOperation.dataMapConnections,
    getSourceIdFromReactFlowConnectionId(reactFlowKey),
    getDestinationIdFromReactFlowConnectionId(reactFlowKey)
  );

  doDataMapOperation(curDataMapState, {
    ...curDataMapState.curDataMapOperation,
    dataMapConnections: { ...curDataMapState.curDataMapOperation.dataMapConnections },
  });
  curDataMapState.notificationData = { type: NotificationTypes.ConnectionDeleted, autoHideDurationMs: deletedNotificationAutoHideDuration };
};

export const addParentConnectionForRepeatingElements = (
  targetNode: FunctionData | SchemaNodeExtended,
  sourceNode: FunctionData | SchemaNodeExtended,
  flattenedSourceSchema: SchemaNodeDictionary,
  flattenedTargetSchema: SchemaNodeDictionary,
  dataMapConnections: ConnectionDictionary
) => {
  if (isSchemaNodeExtended(sourceNode) && isSchemaNodeExtended(targetNode)) {
    if (sourceNode.parentKey) {
      const firstTargetNodeWithRepeatingPathItem = findLast(targetNode.pathToRoot, (pathItem) => pathItem.repeating);

      const prefixedSourceKey = addReactFlowPrefix(sourceNode.parentKey, SchemaType.Source);
      const parentSourceNode = flattenedSourceSchema[prefixedSourceKey];
      const firstSourceNodeWithRepeatingPathItem = findLast(parentSourceNode.pathToRoot, (pathItem) => pathItem.repeating);

      if (firstSourceNodeWithRepeatingPathItem && firstTargetNodeWithRepeatingPathItem) {
        const parentPrefixedSourceKey = addReactFlowPrefix(firstSourceNodeWithRepeatingPathItem.key, SchemaType.Source);
        const parentSourceNode = flattenedSourceSchema[parentPrefixedSourceKey];

        const parentPrefixedTargetKey = addReactFlowPrefix(firstTargetNodeWithRepeatingPathItem.key, SchemaType.Target);
        const parentTargetNode = flattenedTargetSchema[parentPrefixedTargetKey];

        const parentsAlreadyConnected = nodeHasSpecificInputEventually(
          parentPrefixedSourceKey,
          dataMapConnections[parentPrefixedTargetKey],
          dataMapConnections,
          true
        );

        if (!parentsAlreadyConnected) {
          addNodeToConnections(dataMapConnections, parentSourceNode, parentPrefixedSourceKey, parentTargetNode, parentPrefixedTargetKey);
        }
      }
    }
  }
};
