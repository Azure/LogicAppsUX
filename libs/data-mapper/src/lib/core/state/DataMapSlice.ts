import type { ToolboxPanelTabs } from '../../components/canvasToolbox/CanvasToolbox';
import type { NotificationData } from '../../components/notification/Notification';
import {
  deletedNotificationAutoHideDuration,
  errorNotificationAutoHideDuration,
  NotificationTypes,
} from '../../components/notification/Notification';
import type { SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended, SourceSchemaNodeExtended } from '../../models';
import { SchemaNodeProperty, SchemaType } from '../../models';
import type { ConnectionDictionary, InputConnection } from '../../models/Connection';
import type { FunctionData, FunctionDictionary } from '../../models/Function';
import { indexPseudoFunction } from '../../models/Function';
import { findLast } from '../../utils/Array.Utils';
import {
  bringInParentSourceNodesForRepeating,
  createConnectionEntryIfNeeded,
  flattenInputs,
  getConnectedSourceSchemaNodes,
  getConnectedTargetSchemaNodes,
  getFunctionConnectionUnits,
  getTargetSchemaNodeConnections,
  isConnectionUnit,
  nodeHasSpecificInputEventually,
  setConnectionInputValue,
} from '../../utils/Connection.Utils';
// eslint-disable-next-line import/namespace
import {
  addNodeToCanvasIfDoesNotExist,
  addParentConnectionForRepeatingElementsNested,
  bringInNestedNodes,
  getParentId,
} from '../../utils/DataMap.Utils';
import { isFunctionData } from '../../utils/Function.Utils';
import {
  addReactFlowPrefix,
  addSourceReactFlowPrefix,
  addTargetReactFlowPrefix,
  createReactFlowFunctionKey,
  getDestinationIdFromReactFlowConnectionId,
  getSourceIdFromReactFlowConnectionId,
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
  currentSourceSchemaNodes: SourceSchemaNodeExtended[];
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
  sourceSchemaOrdering: [],
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

export interface SetConnectionInputAction {
  targetNode: SchemaNodeExtended | FunctionData;
  targetNodeReactFlowKey: string;
  inputIndex?: number;
  value: InputConnection | null; // null is indicator to remove an unbounded input value
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

    setInitialSchema: (state, action: PayloadAction<InitialSchemaAction>) => {
      const flattenedSchema = flattenSchemaIntoDictionary(action.payload.schema, action.payload.schemaType);

      if (action.payload.schemaType === SchemaType.Source) {
        const schemaSortArray = flattenSchemaIntoSortArray(action.payload.schema.schemaTreeRoot);

        state.curDataMapOperation.sourceSchema = action.payload.schema;
        state.curDataMapOperation.flattenedSourceSchema = flattenedSchema;
        state.curDataMapOperation.sourceSchemaOrdering = schemaSortArray;
        state.pristineDataMap.sourceSchema = action.payload.schema;
        state.pristineDataMap.flattenedSourceSchema = flattenedSchema;
        state.pristineDataMap.sourceSchemaOrdering = schemaSortArray;
      } else {
        state.curDataMapOperation.targetSchema = action.payload.schema;
        state.curDataMapOperation.flattenedTargetSchema = flattenedSchema;
        state.curDataMapOperation.currentTargetSchemaNode = undefined;
        state.pristineDataMap.targetSchema = action.payload.schema;
        state.pristineDataMap.flattenedTargetSchema = flattenedSchema;
      }
    },

    setInitialDataMap: (state, action: PayloadAction<InitialDataMapAction>) => {
      const { sourceSchema, targetSchema, dataMapConnections } = action.payload;
      const currentState = state.curDataMapOperation;

      const flattenedSourceSchema = flattenSchemaIntoDictionary(sourceSchema, SchemaType.Source);
      const schemaSortArray = flattenSchemaIntoSortArray(sourceSchema.schemaTreeRoot);
      const flattenedTargetSchema = flattenSchemaIntoDictionary(targetSchema, SchemaType.Target);

      const newState: DataMapOperationState = {
        ...currentState,
        sourceSchema,
        targetSchema,
        flattenedSourceSchema,
        sourceSchemaOrdering: schemaSortArray,
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
        addNodeToCanvasIfDoesNotExist(payloadNode, state.curDataMapOperation.currentSourceSchemaNodes, nodes);
        bringInNestedNodes(
          payloadNode,
          state.curDataMapOperation.currentSourceSchemaNodes,
          state.curDataMapOperation.flattenedSourceSchema,
          nodes
        );

        // // if parent already exists on the canvas, add all interim ones
        // const grandparentNodesOnCanvas = state.curDataMapOperation.currentSourceSchemaNodes.filter(
        //   (node) => existingNode?.key.includes(node.key) && existingNode.parentKey !== node.key
        // );
        // if (grandparentNodesOnCanvas) {
        //   // add all nodes between child and grandparent
        // }

        // // else do this
        // // Danielle add interim parents so that tree makes sense
        // const pathToRootWithoutCurrent = payloadNode.pathToRoot.filter((node) => node.key !== payloadNode.key);
        // const firstSourceNodeWithRepeatingPathItem = findLast(pathToRootWithoutCurrent, (pathItem) => pathItem.repeating);
        // const parentNodeToAdd =
        //   firstSourceNodeWithRepeatingPathItem &&
        //   firstSourceNodeWithRepeatingPathItem &&
        //   state.curDataMapOperation.flattenedSourceSchema[addSourceReactFlowPrefix(firstSourceNodeWithRepeatingPathItem.key)];
        // if (parentNodeToAdd) {
        //   const parentIfAdded = state.curDataMapOperation.currentSourceSchemaNodes.find(
        //     (currentNode) => currentNode.key === payloadNode.key
        //   );
        //   if (!parentIfAdded) {
        //     nodes.push(parentNodeToAdd);
        //   }
        // }

        // danielle then add anything in-between children on the canvas
      });

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceSchemaNodes: nodes,
      };

      doDataMapOperation(state, newState);
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

    deleteConnection: (state, action: PayloadAction<{ inputKey: string; outputKey: string }>) => {
      const newState = { ...state.curDataMapOperation };
      deleteConnectionFromConnections(newState.dataMapConnections, action.payload.inputKey, action.payload.outputKey);

      doDataMapOperation(state, newState);
    },

    makeConnection: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      addConnection(newState.dataMapConnections, action.payload);
      const afterConnectionMade = { ...newState.dataMapConnections };

      // Add any repeating parent nodes as well
      // Get all the source nodes in case we have sources from multiple source chains
      const originalSourceNode = action.payload.source;
      let actualSources: SchemaNodeExtended[];
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
          addParentConnectionForRepeatingElementsNested(
            sourceNode,
            actualTarget[0],
            newState.flattenedSourceSchema,
            newState.flattenedTargetSchema,
            newState.dataMapConnections
          );

          // If new parent connection has been made
          if (JSON.stringify(newState.dataMapConnections) !== JSON.stringify(afterConnectionMade)) {
            state.notificationData = { type: NotificationTypes.ArrayConnectionAdded };
          }

          // Bring in correct source nodes
          // Loop through parent nodes connected to
          const parentTargetNode = state.curDataMapOperation.currentTargetSchemaNode;
          bringInParentSourceNodesForRepeating(parentTargetNode, newState);
        }
      });

      doDataMapOperation(state, newState);
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

      setConnectionInputValue(newState.dataMapConnections, action.payload);

      doDataMapOperation(state, newState);
    },

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
  deleteConnection,
  setXsltFilename,
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
const doDataMapOperation = (state: DataMapState, newCurrentState: DataMapOperationState) => {
  state.undoStack = state.undoStack.slice(-19);
  state.undoStack.push(state.curDataMapOperation);
  state.curDataMapOperation = newCurrentState;
  state.redoStack = [];
  state.isDirty = true;
};

const addConnection = (newConnections: ConnectionDictionary, nodes: ConnectionAction): void => {
  setConnectionInputValue(newConnections, {
    targetNode: nodes.destination,
    targetNodeReactFlowKey: nodes.reactFlowDestination,
    findInputSlot: true,
    value: {
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

export const deleteConnectionFromConnections = (connections: ConnectionDictionary, inputKey: string, outputKey: string) => {
  connections[inputKey].outputs = connections[inputKey].outputs.filter((output) => output.reactFlowKey !== outputKey);

  Object.entries(connections[outputKey].inputs).forEach(
    ([key, input]) =>
      (connections[outputKey].inputs[key] = input.filter((inputEntry) =>
        isConnectionUnit(inputEntry) ? inputEntry.reactFlowKey !== inputKey : true
      ))
  );
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
          deleteConnectionFromConnections(connections, parentId, connections[parentId].outputs[0].reactFlowKey);
        }
      });

      deleteParentRepeatingConnections(connections, parentId);
    }
  }
};

export const canDeleteConnection = (sourceNodeId: string, sourceSchema: SchemaNodeDictionary) => {
  const sourceNode = sourceSchema[sourceNodeId];
  if (!sourceNode || (sourceNode && !sourceNode.nodeProperties.includes(SchemaNodeProperty.Repeating))) {
    return true;
  }

  return false;
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

    // NOTE: Do NOT delete source schema node from connections - at this stage, it's guaranteed that
    // there are no connections to it, and we don't want to accidentally delete connections on other layers

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

  // Item to be deleted is a connection
  const sourceId = getSourceIdFromReactFlowConnectionId(reactFlowKey);
  const sourceSchema = curDataMapState.curDataMapOperation.flattenedSourceSchema;
  const canDelete = canDeleteConnection(sourceId, sourceSchema);
  const connections = { ...curDataMapState.curDataMapOperation.dataMapConnections };

  if (canDelete) {
    deleteConnectionFromConnections(
      connections,
      getSourceIdFromReactFlowConnectionId(reactFlowKey),
      getDestinationIdFromReactFlowConnectionId(reactFlowKey)
    );
    const tempConn = connections[getSourceIdFromReactFlowConnectionId(reactFlowKey)];
    const ids = getConnectedSourceSchemaNodes([tempConn], connections);
    if (ids.length > 0) {
      deleteParentRepeatingConnections(connections, addSourceReactFlowPrefix(ids[0].key));
    }

    curDataMapState.notificationData = {
      type: NotificationTypes.ConnectionDeleted,
      autoHideDurationMs: deletedNotificationAutoHideDuration,
    };
  } else {
    const sourceNode = sourceSchema[sourceId];
    curDataMapState.notificationData = {
      type: NotificationTypes.RepeatingConnectionCannotDelete,
      msgParam: sourceNode.name,
      autoHideDurationMs: errorNotificationAutoHideDuration,
    };
  }

  doDataMapOperation(curDataMapState, {
    ...curDataMapState.curDataMapOperation,
    dataMapConnections: { ...connections },
  });
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
            setConnectionInputValue(dataMapConnections, {
              targetNode: parentTargetNode,
              targetNodeReactFlowKey: parentPrefixedTargetKey,
              findInputSlot: true,
              value: {
                reactFlowKey: parentPrefixedSourceKey,
                node: parentSourceNode,
              },
            });
          } else {
            // If provided, we need to plug in an index() between the parent loop elements
            // Source schema node -> Index()
            setConnectionInputValue(dataMapConnections, {
              targetNode: indexPseudoFunction,
              targetNodeReactFlowKey: indexFnRfKey,
              findInputSlot: true,
              value: {
                reactFlowKey: parentPrefixedSourceKey,
                node: parentSourceNode,
              },
            });

            // Index() -> target schema node
            setConnectionInputValue(dataMapConnections, {
              targetNode: parentTargetNode,
              targetNodeReactFlowKey: parentPrefixedTargetKey,
              findInputSlot: true,
              value: {
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
