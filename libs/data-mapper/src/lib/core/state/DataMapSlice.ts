import { type NotificationData, NotificationTypes } from '../../components/notification/Notification';
import type { SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../../models';
import { SchemaNodeProperties, SchemaTypes } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import type { FunctionData, FunctionDictionary } from '../../models/Function';
import type { SelectedNode } from '../../models/SelectedNode';
import { NodeType } from '../../models/SelectedNode';
import { addReactFlowPrefix } from '../../utils/ReactFlow.Util';
import { isSchemaNodeExtended } from '../../utils/Schema.Utils';
import { guid } from '@microsoft-logic-apps/utils';
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
  currentSourceNodes: SchemaNodeExtended[];
  currentTargetNode?: SchemaNodeExtended;
  currentFunctionNodes: FunctionDictionary;
  currentlySelectedNode?: SelectedNode;
  xsltFilename: string;
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  currentSourceNodes: [],
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
  schemaType: SchemaTypes.Source | SchemaTypes.Target;
  flattenedSchema: SchemaNodeDictionary;
}

export interface ConnectionAction {
  source: SchemaNodeExtended | FunctionData;
  destination: SchemaNodeExtended | FunctionData;

  reactFlowSource: string;
  reactFlowDestination: string;
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
      if (action.payload.schemaType === SchemaTypes.Source) {
        state.curDataMapOperation.sourceSchema = action.payload.schema;
        state.curDataMapOperation.flattenedSourceSchema = action.payload.flattenedSchema;
        state.pristineDataMap.sourceSchema = action.payload.schema;
        state.pristineDataMap.flattenedSourceSchema = action.payload.flattenedSchema;
      } else {
        state.curDataMapOperation.targetSchema = action.payload.schema;
        state.curDataMapOperation.flattenedTargetSchema = action.payload.flattenedSchema;
        state.curDataMapOperation.currentTargetNode = action.payload.schema.schemaTreeRoot;
        state.pristineDataMap.targetSchema = action.payload.schema;
        state.pristineDataMap.flattenedTargetSchema = action.payload.flattenedSchema;
        state.pristineDataMap.currentTargetNode = action.payload.schema.schemaTreeRoot;
      }
    },

    setInitialDataMap: (state, action: PayloadAction<ConnectionDictionary | undefined>) => {
      const incomingConnections = action.payload;
      const currentState = state.curDataMapOperation;

      if (currentState.sourceSchema && currentState.targetSchema) {
        let newState: DataMapOperationState = {
          ...currentState,
          dataMapConnections: {},
          currentSourceNodes: [],
          currentTargetNode: currentState.targetSchema.schemaTreeRoot,
        };

        if (incomingConnections) {
          const topLevelSourceNodes: SchemaNodeExtended[] = [];

          Object.values(incomingConnections).forEach((connection) => {
            // TODO change to support functions
            connection.sources.forEach((source) => {
              if (isSchemaNodeExtended(source.node) && source.node.pathToRoot.length < 2) {
                topLevelSourceNodes.push(currentState.flattenedSourceSchema[source.reactFlowKey]);
              }
            });
          });

          newState = {
            ...currentState,
            currentSourceNodes: topLevelSourceNodes,
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

    setCurrentSourceNodes: (state, action: PayloadAction<SchemaNodeExtended[] | undefined>) => {
      let nodes: SchemaNodeExtended[] = [];
      if (action.payload) {
        const uniqueNodes = state.curDataMapOperation.currentSourceNodes.concat(action.payload).filter((node, index, self) => {
          return self.findIndex((subNode) => subNode.key === node.key) === index;
        });

        nodes = uniqueNodes;
      }

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },

    addSourceNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      const nodes = [...state.curDataMapOperation.currentSourceNodes];
      action.payload.forEach((payloadNode) => {
        const existingNode = state.curDataMapOperation.currentSourceNodes.find((currentNode) => currentNode.key === payloadNode.key);
        if (!existingNode) {
          nodes.push(payloadNode);
        }
      });

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },

    removeSourceNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      let nodes = [...state.curDataMapOperation.currentSourceNodes];
      nodes = state.curDataMapOperation.currentSourceNodes.filter((currentNode) =>
        action.payload.every((payloadNode) => payloadNode.key !== currentNode.key)
      );

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },

    toggleSourceNode: (state, action: PayloadAction<SchemaNodeExtended>) => {
      let nodes = [...state.curDataMapOperation.currentSourceNodes];
      const existingNode = state.curDataMapOperation.currentSourceNodes.find((currentNode) => currentNode.key === action.payload.key);
      if (existingNode) {
        nodes = state.curDataMapOperation.currentSourceNodes.filter((currentNode) => currentNode.key !== action.payload.key);
      } else {
        nodes.push(action.payload);
      }

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentSourceNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },

    setCurrentTargetNode: (state, action: PayloadAction<{ schemaNode: SchemaNodeExtended; resetSelectedSourceNodes: boolean }>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentTargetNode: action.payload.schemaNode,
        currentSourceNodes: action.payload.resetSelectedSourceNodes ? [] : state.curDataMapOperation.currentSourceNodes,
      };

      doDataMapOperation(state, newState);
    },

    setCurrentlySelectedEdge: (state, action: PayloadAction<string>) => {
      const edge = state.curDataMapOperation.dataMapConnections[action.payload];
      edge.isSelected = !edge.isSelected;
    },

    setCurrentlySelectedNode: (state, action: PayloadAction<SelectedNode | undefined>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentlySelectedNode: action.payload,
      };

      doDataMapOperation(state, newState);
    },

    deleteCurrentlySelectedItem: (state) => {
      const selectedNode = state.curDataMapOperation.currentlySelectedNode;

      if (selectedNode && selectedNode.nodeType !== NodeType.Target) {
        switch (selectedNode.nodeType) {
          case NodeType.Source: {
            const removedNodes = state.curDataMapOperation.currentSourceNodes.filter((node) => node.name !== selectedNode.name);

            const srcNodeHasConnections = Object.values(state.curDataMapOperation.dataMapConnections).some((connection) =>
              connection.sources.some((source) => source.node.key === selectedNode.path)
            );

            if (srcNodeHasConnections) {
              state.notificationData = { type: NotificationTypes.SourceNodeRemoveFailed, msgParam: selectedNode.name };
              return;
            }

            doDataMapOperation(state, { ...state.curDataMapOperation, currentSourceNodes: removedNodes });

            state.notificationData = { type: NotificationTypes.SourceNodeRemoved };
            break;
          }
          case NodeType.Function: {
            const newFunctionsState = { ...state.curDataMapOperation.currentFunctionNodes };
            delete newFunctionsState[selectedNode.id];

            Object.values(state.curDataMapOperation.dataMapConnections).forEach((connection) => {
              // eslint-disable-next-line no-param-reassign
              connection.sources = connection.sources.filter((source) => source.reactFlowKey !== selectedNode.id);
            });

            // Only need to remove connections if we've actually persisted some for the function
            if (state.curDataMapOperation.dataMapConnections[selectedNode.id]) {
              state.curDataMapOperation.dataMapConnections[selectedNode.id].sources = [];
            }

            doDataMapOperation(state, { ...state.curDataMapOperation, currentFunctionNodes: newFunctionsState });
            state.notificationData = { type: NotificationTypes.FunctionNodeDeleted };
            break;
          }
          default:
            break;
        }

        state.curDataMapOperation.currentlySelectedNode = undefined;
      } else {
        const connections = state.curDataMapOperation.dataMapConnections;

        for (const key in connections) {
          if (connections[key].isSelected) {
            delete connections[key];
            // delete child if necessary
          }
        }

        doDataMapOperation(state, { ...state.curDataMapOperation, dataMapConnections: connections });
      }
    },

    addFunctionNode: (state, action: PayloadAction<FunctionData>) => {
      const functionData = action.payload;
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentFunctionNodes: { ...state.curDataMapOperation.currentFunctionNodes },
      };

      newState.currentFunctionNodes[`${functionData.key}-${guid()}`] = functionData;

      doDataMapOperation(state, newState);
    },

    makeConnection: (state, action: PayloadAction<ConnectionAction>) => {
      const source = action.payload.source;
      const destination = action.payload.destination;

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      if (!newState.dataMapConnections[action.payload.reactFlowDestination]) {
        newState.dataMapConnections[action.payload.reactFlowDestination] = {
          sources: [{ node: source, reactFlowKey: action.payload.reactFlowSource }],
          destination: { node: destination, reactFlowKey: action.payload.reactFlowDestination },
        };
      } else {
        newState.dataMapConnections[action.payload.reactFlowDestination].sources.push({
          node: source,
          reactFlowKey: action.payload.reactFlowSource,
        });
      }

      const targetParentNode = state.curDataMapOperation.currentTargetNode;

      if (targetParentNode?.properties === SchemaNodeProperties.Repeating && isSchemaNodeExtended(source)) {
        // only add parent source node and connection if parent node & parent node repeating
        source.pathToRoot.forEach((parentKey) => {
          // danielle refactor
          const sourceParent = state.curDataMapOperation.flattenedSourceSchema[addReactFlowPrefix(parentKey.key, SchemaTypes.Source)];

          if (sourceParent.properties === SchemaNodeProperties.Repeating) {
            if (state.curDataMapOperation.currentSourceNodes.find((node) => node.key !== sourceParent.key)) {
              newState.currentSourceNodes.push(sourceParent);
            }

            // TODO Confirm this is still correct after connections change
            if (!state.curDataMapOperation.dataMapConnections[targetParentNode.key]) {
              // danielle test undo!!!
              newState.dataMapConnections[targetParentNode.key] = {
                sources: [{ node: sourceParent, reactFlowKey: addReactFlowPrefix(sourceParent.key, SchemaTypes.Source) }],
                destination: { node: targetParentNode, reactFlowKey: addReactFlowPrefix(targetParentNode.key, SchemaTypes.Target) },
              };
            }
          }
        });
      }

      doDataMapOperation(state, newState);
    },

    changeConnection: (state, action: PayloadAction<ConnectionAction & DeleteConnectionAction>) => {
      const source = action.payload.source;
      const destination = action.payload.destination;

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      const oldDestination = Object.values(newState.dataMapConnections).find(
        (connection) => connection.destination.reactFlowKey === action.payload.connectionKey
      );
      if (oldDestination) {
        oldDestination.sources = oldDestination.sources.filter((source) => source.reactFlowKey !== action.payload.inputKey);
      }

      // danielle what happens when connection changes from one array to another
      if (!newState.dataMapConnections[action.payload.reactFlowDestination]) {
        newState.dataMapConnections[action.payload.reactFlowDestination] = {
          sources: [{ node: source, reactFlowKey: action.payload.reactFlowSource }],
          destination: { node: destination, reactFlowKey: action.payload.reactFlowDestination },
        };
      } else {
        newState.dataMapConnections[action.payload.reactFlowDestination].sources.push({
          node: source,
          reactFlowKey: action.payload.reactFlowSource,
        });
      }

      doDataMapOperation(state, newState);
    },

    setConnectionHovered: (state, action: PayloadAction<{ connectionId: string; isHovered: boolean }>) => {
      state.curDataMapOperation.dataMapConnections[action.payload.connectionId].isHovered = action.payload.isHovered;
    },

    deleteConnection: (state, action: PayloadAction<DeleteConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      const destination = Object.values(newState.dataMapConnections).find(
        (connection) => connection.destination.reactFlowKey === action.payload.connectionKey
      );
      if (destination) {
        destination.sources = destination.sources.filter((source) => source.reactFlowKey !== action.payload.inputKey);
      }

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
  setCurrentSourceNodes,
  addSourceNodes,
  removeSourceNodes,
  toggleSourceNode,
  setCurrentTargetNode,
  setCurrentlySelectedNode,
  addFunctionNode,
  makeConnection,
  changeConnection,
  setConnectionHovered,
  deleteConnection,
  undoDataMapOperation,
  redoDataMapOperation,
  saveDataMap,
  discardDataMap,
  deleteCurrentlySelectedItem,
  setCurrentlySelectedEdge,
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
