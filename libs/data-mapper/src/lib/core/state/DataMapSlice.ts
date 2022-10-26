import type { NotificationData } from '../../components/notification/Notification';
import { NotificationTypes } from '../../components/notification/Notification';
import type { SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../../models';
import { SchemaNodeProperties, SchemaType } from '../../models';
import type { ConnectionDictionary, InputConnection } from '../../models/Connection';
import type { FunctionData, FunctionDictionary } from '../../models/Function';
import {
  addNodeToConnections,
  createConnectionEntryIfNeeded,
  flattenInputs,
  getConnectedSourceSchemaNodes,
  getFunctionConnectionUnits,
  getTargetSchemaNodeConnections,
  isConnectionUnit,
  isCustomValue,
  nodeHasSpecificInputEventually,
  updateConnectionInputValue,
} from '../../utils/Connection.Utils';
import {
  addReactFlowPrefix,
  createReactFlowFunctionKey,
  getDestinationIdFromReactFlowId,
  getSourceIdFromReactFlowId,
} from '../../utils/ReactFlow.Util';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  undoStack: DataMapOperationState[];
  redoStack: DataMapOperationState[];
  notificationData?: NotificationData;
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
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  currentSourceSchemaNodes: [],
  currentFunctionNodes: {},
  flattenedSourceSchema: {},
  flattenedTargetSchema: {},
  xsltFilename: '',
};

const initialState: DataMapState = {
  pristineDataMap: emptyPristineState,
  curDataMapOperation: emptyPristineState,
  isDirty: false,
  undoStack: [],
  redoStack: [],
};

export interface InitialSchemaAction {
  schema: SchemaExtended;
  schemaType: SchemaType.Source | SchemaType.Target;
  flattenedSchema: SchemaNodeDictionary;
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
      if (action.payload.schemaType === SchemaType.Source) {
        state.curDataMapOperation.sourceSchema = action.payload.schema;
        state.curDataMapOperation.flattenedSourceSchema = action.payload.flattenedSchema;
        state.pristineDataMap.sourceSchema = action.payload.schema;
        state.pristineDataMap.flattenedSourceSchema = action.payload.flattenedSchema;
      } else {
        state.curDataMapOperation.targetSchema = action.payload.schema;
        state.curDataMapOperation.flattenedTargetSchema = action.payload.flattenedSchema;
        state.curDataMapOperation.currentTargetSchemaNode = action.payload.schema.schemaTreeRoot;
        state.pristineDataMap.targetSchema = action.payload.schema;
        state.pristineDataMap.flattenedTargetSchema = action.payload.flattenedSchema;
        state.pristineDataMap.currentTargetSchemaNode = action.payload.schema.schemaTreeRoot;
      }
    },

    setInitialDataMap: (state, action: PayloadAction<ConnectionDictionary | undefined>) => {
      const incomingConnections = action.payload;
      const currentState = state.curDataMapOperation;

      if (currentState.sourceSchema && currentState.targetSchema) {
        let newState: DataMapOperationState = {
          ...currentState,
          dataMapConnections: {},
          currentSourceSchemaNodes: [],
          currentTargetSchemaNode: currentState.targetSchema.schemaTreeRoot,
        };

        if (incomingConnections) {
          const topLevelSourceNodes: SchemaNodeExtended[] = [];

          Object.values(incomingConnections).forEach((connection) => {
            // TODO change to support functions

            // NOTE: May not need any of this once overview has been fully implemented
            // - a setCurrentTargetSchemaNode (see its functionality) should then always happen
            // before we have to show any connections in the first place
            flattenInputs(connection.inputs).forEach((input) => {
              if (!input || isCustomValue(input)) {
                return;
              }

              if (isSchemaNodeExtended(input.node) && input.node.pathToRoot.length < 2) {
                topLevelSourceNodes.push(currentState.flattenedSourceSchema[input.reactFlowKey]);
              }
            });
          });

          newState = {
            ...currentState,
            currentSourceSchemaNodes: topLevelSourceNodes,
            dataMapConnections: incomingConnections,
          };
        }

        state.curDataMapOperation = newState;
        state.pristineDataMap = newState;
      }
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
      let nodes = [...state.curDataMapOperation.currentSourceSchemaNodes];
      nodes = state.curDataMapOperation.currentSourceSchemaNodes.filter((currentNode) =>
        action.payload.every((payloadNode) => payloadNode.key !== currentNode.key)
      );

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceSchemaNodes: nodes,
      };

      doDataMapOperation(state, newState);
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

    setCurrentTargetSchemaNode: (state, action: PayloadAction<SchemaNodeExtended>) => {
      //const currentTargetSchemaNode = state.curDataMapOperation.currentTargetSchemaNode;
      const newTargetSchemaNode = action.payload;

      // TODO
      // Remove any nodes/connection-chains that don't connect to a target schema node on the current level
      // - garbage collection for nodes that will never be displayed again

      const cleanConnections = { ...state.curDataMapOperation.dataMapConnections };

      //const currentTargetSchemaNodeConnections = getTargetSchemaNodeConnections(currentTargetSchemaNode, state.curDataMapOperation.dataMapConnections);
      //const currentFullyConnectedSourceSchemaNodes = getConnectedSourceSchemaNodes(currentTargetSchemaNodeConnections, state.curDataMapOperation.dataMapConnections);
      //const currentFullyConnectedFunctionConnectionUnits = getFunctionConnectionUnits(currentTargetSchemaNodeConnections, state.curDataMapOperation.dataMapConnections);

      // Reset currentSourceSchema/FunctionNodes, and add back any nodes part of complete connection chains on the new target schema level

      const newTargetSchemaNodeConnections = getTargetSchemaNodeConnections(newTargetSchemaNode, cleanConnections);

      const newFullyConnectedSourceSchemaNodes = getConnectedSourceSchemaNodes(newTargetSchemaNodeConnections, cleanConnections);
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
        if (state.curDataMapOperation.flattenedTargetSchema[selectedKey]) {
          return;
        }

        const sourceNode = state.curDataMapOperation.flattenedSourceSchema[selectedKey];
        if (sourceNode) {
          const removedNodes = state.curDataMapOperation.currentSourceSchemaNodes.filter((node) => node.name !== sourceNode.name);
          deleteNodeFromConnections(state.curDataMapOperation.dataMapConnections, selectedKey);

          state.curDataMapOperation.selectedItemKey = undefined;
          doDataMapOperation(state, { ...state.curDataMapOperation, currentSourceSchemaNodes: removedNodes });
          state.notificationData = { type: NotificationTypes.SourceNodeRemoved };
          return;
        }

        const functionNode = state.curDataMapOperation.currentFunctionNodes[selectedKey];
        if (functionNode) {
          const newFunctionsState = { ...state.curDataMapOperation.currentFunctionNodes };
          delete newFunctionsState[selectedKey];

          deleteNodeFromConnections(state.curDataMapOperation.dataMapConnections, selectedKey);

          state.curDataMapOperation.selectedItemKey = undefined;
          doDataMapOperation(state, { ...state.curDataMapOperation, currentFunctionNodes: newFunctionsState });
          state.notificationData = { type: NotificationTypes.FunctionNodeDeleted };
          return;
        }

        deleteConnectionFromConnections(
          state.curDataMapOperation.dataMapConnections,
          getSourceIdFromReactFlowId(selectedKey),
          getDestinationIdFromReactFlowId(selectedKey)
        );

        doDataMapOperation(state, { ...state.curDataMapOperation, dataMapConnections: state.curDataMapOperation.dataMapConnections });
        state.notificationData = { type: NotificationTypes.ConnectionDeleted };
      }
    },

    addFunctionNode: (state, action: PayloadAction<FunctionData>) => {
      const functionData = action.payload;
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentFunctionNodes: { ...state.curDataMapOperation.currentFunctionNodes },
      };

      newState.currentFunctionNodes[createReactFlowFunctionKey(functionData)] = functionData;

      doDataMapOperation(state, newState);
    },

    makeConnection: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      addConnection(newState.dataMapConnections, action.payload);

      // XXX Bug here that if you add the connection one level above, then we still make the auto connection when you navigate down and add children
      // Add any repeating parent nodes as well
      const parentTargetNode = newState.currentTargetSchemaNode;
      const sourceNode = action.payload.source;
      if (parentTargetNode && parentTargetNode.properties === SchemaNodeProperties.Repeating && isSchemaNodeExtended(sourceNode)) {
        if (sourceNode.parentKey) {
          const prefixedSourceKey = addReactFlowPrefix(sourceNode.parentKey, SchemaType.Source);
          const parentSourceNode = newState.flattenedSourceSchema[prefixedSourceKey];
          const prefixedTargetKey = addReactFlowPrefix(parentTargetNode.key, SchemaType.Target);
          if (
            parentSourceNode.properties === SchemaNodeProperties.Repeating &&
            !nodeHasSpecificInputEventually(
              prefixedSourceKey,
              newState.dataMapConnections[prefixedTargetKey],
              newState.dataMapConnections,
              true
            )
          ) {
            if (!newState.currentSourceSchemaNodes.find((node) => node.key === parentSourceNode.key)) {
              newState.currentSourceSchemaNodes.push(parentSourceNode);
            }

            addNodeToConnections(newState.dataMapConnections, parentSourceNode, prefixedSourceKey, parentTargetNode, prefixedTargetKey);
            state.notificationData = { type: NotificationTypes.ArrayConnectionAdded };
          }
        }
      }

      doDataMapOperation(state, newState);
    },

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

    updateConnectionInput: (state, action: PayloadAction<UpdateConnectionInputAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      updateConnectionInputValue(newState.dataMapConnections, action.payload);

      doDataMapOperation(state, newState);
    },

    deleteConnection: (state, action: PayloadAction<DeleteConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      deleteConnectionFromConnections(newState.dataMapConnections, action.payload.inputKey, action.payload.connectionKey);

      doDataMapOperation(state, newState);
      state.notificationData = { type: NotificationTypes.ConnectionDeleted };
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
  changeConnection,
  updateConnectionInput,
  deleteConnection,
  undoDataMapOperation,
  redoDataMapOperation,
  saveDataMap,
  discardDataMap,
  deleteCurrentlySelectedItem,
  showNotification,
  hideNotification,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;

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
        // eslint-disable-next-line no-param-reassign
        connections[input.reactFlowKey].outputs = connections[input.reactFlowKey].outputs.filter(
          (output) => output.reactFlowKey !== keyToDelete
        );
      }
    });

    // Step through all the outputs and delete the selected key from their inputs
    connections[keyToDelete].outputs.forEach((outputConnection) => {
      Object.values(connections[outputConnection.reactFlowKey].inputs).forEach((outputConnectionInput, index) => {
        // eslint-disable-next-line no-param-reassign
        connections[outputConnection.reactFlowKey].inputs[index] = outputConnectionInput.filter((input) =>
          isConnectionUnit(input) ? input.reactFlowKey !== keyToDelete : true
        );
      });
    });
  }

  // eslint-disable-next-line no-param-reassign
  delete connections[keyToDelete];
};

export const deleteConnectionFromConnections = (connections: ConnectionDictionary, inputKey: string, outputKey: string) => {
  // eslint-disable-next-line no-param-reassign
  connections[inputKey].outputs = connections[inputKey].outputs.filter((output) => output.reactFlowKey !== outputKey);

  Object.entries(connections[outputKey].inputs).forEach(
    ([key, input]) =>
      // eslint-disable-next-line no-param-reassign
      (connections[outputKey].inputs[key] = input.filter((inputEntry) =>
        isConnectionUnit(inputEntry) ? inputEntry.reactFlowKey !== inputKey : true
      ))
  );
};
