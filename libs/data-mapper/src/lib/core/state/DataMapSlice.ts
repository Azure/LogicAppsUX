import type { SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended } from '../../models';
import { SchemaNodeProperties, SchemaTypes } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import type { FunctionData, FunctionDictionary } from '../../models/Function';
import type { SelectedNode } from '../../models/SelectedNode';
import { NodeType } from '../../models/SelectedNode';
import { addReactFlowPrefix, createConnectionKey } from '../../utils/DataMapIds.Utils';
import { guid } from '@microsoft-logic-apps/utils';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  undoStack: DataMapOperationState[];
  redoStack: DataMapOperationState[];
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
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  currentSourceNodes: [],
  currentFunctionNodes: {},
  flattenedSourceSchema: {},
  flattenedTargetSchema: {},
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
  source: SchemaNodeExtended;
  destination: SchemaNodeExtended;

  reactFlowSource: string;
  reactFlowDestination: string;
}

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
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
            if ((connection.source as SchemaNodeExtended).pathToRoot.length < 2) {
              topLevelSourceNodes.push(currentState.flattenedSourceSchema[connection.reactFlowSource]);
            }
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

            for (const connectionKey in state.curDataMapOperation.dataMapConnections) {
              if (state.curDataMapOperation.dataMapConnections[connectionKey].source.key === selectedNode.path) {
                delete state.curDataMapOperation.dataMapConnections[connectionKey];
              }
            }

            doDataMapOperation(state, { ...state.curDataMapOperation, currentSourceNodes: removedNodes });
            break;
          }
          case NodeType.Function: {
            const newFunctionsState = { ...state.curDataMapOperation.currentFunctionNodes };
            delete newFunctionsState[selectedNode.id];

            doDataMapOperation(state, { ...state.curDataMapOperation, currentFunctionNodes: newFunctionsState });

            for (const connectionKey in state.curDataMapOperation.dataMapConnections) {
              const connection = state.curDataMapOperation.dataMapConnections[connectionKey];

              if (selectedNode.id.endsWith(connection.source.key) || selectedNode.id.startsWith(connection.destination.key)) {
                delete state.curDataMapOperation.dataMapConnections[connectionKey];
              }
            }

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

    removeFunctionNode: (state, action: PayloadAction<string>) => {
      const functionKey = action.payload;

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentFunctionNodes: { ...state.curDataMapOperation.currentFunctionNodes },
      };

      delete newState.dataMapConnections[functionKey];

      doDataMapOperation(state, newState);
    },

    makeConnection: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      newState.dataMapConnections[createConnectionKey(action.payload.source.key, action.payload.destination.key)] = {
        ...action.payload,
      };

      const targetParentNode = state.curDataMapOperation.currentTargetNode;

      if (targetParentNode?.properties === SchemaNodeProperties.Repeating) {
        // only add parent source node and connection if parent node & parent node repeating
        action.payload.source.pathToRoot.forEach((parentKey) => {
          // danielle refactor
          const sourceParent = state.curDataMapOperation.flattenedSourceSchema[addReactFlowPrefix(parentKey.key, 'source')];

          if (sourceParent.properties === SchemaNodeProperties.Repeating) {
            if (state.curDataMapOperation.currentSourceNodes.find((node) => node.key !== sourceParent.key)) {
              newState.currentSourceNodes.push(sourceParent);
            }

            if (state.curDataMapOperation.dataMapConnections[createConnectionKey(sourceParent.key, targetParentNode.key)] === undefined) {
              // danielle test undo!!!
              newState.dataMapConnections[createConnectionKey(sourceParent.key, targetParentNode.key)] = {
                destination: targetParentNode,
                source: sourceParent,
                reactFlowSource: addReactFlowPrefix(sourceParent.key, 'source'),
                reactFlowDestination: addReactFlowPrefix(targetParentNode.key, 'target'),
              };
            }
          }
        });
      }

      doDataMapOperation(state, newState);
    },

    changeConnection: (state, action: PayloadAction<ConnectionAction & { oldConnectionKey: string }>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      delete newState.dataMapConnections[action.payload.oldConnectionKey];

      // danielle what happens when connection changes from one array to another
      newState.dataMapConnections[createConnectionKey(action.payload.source.key, action.payload.destination.key)] = {
        ...action.payload,
      };

      doDataMapOperation(state, newState);
    },

    deleteConnection: (state, action: PayloadAction<string>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      delete newState.dataMapConnections[action.payload];

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
  },
});

export const {
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
  removeFunctionNode,
  makeConnection,
  changeConnection,
  deleteConnection,
  undoDataMapOperation,
  redoDataMapOperation,
  saveDataMap,
  discardDataMap,
  deleteCurrentlySelectedItem,
  setCurrentlySelectedEdge,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;

const doDataMapOperation = (state: DataMapState, newCurrentState: DataMapOperationState) => {
  state.undoStack = state.undoStack.slice(-19);
  state.undoStack.push(state.curDataMapOperation);
  state.curDataMapOperation = newCurrentState;
  state.redoStack = [];
  state.isDirty = true;
};
