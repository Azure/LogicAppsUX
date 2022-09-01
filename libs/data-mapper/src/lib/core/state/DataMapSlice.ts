import type { SchemaExtended, SchemaNodeDictionary, SchemaNodeExtended, SelectedNode } from '../../models';
import { SchemaTypes } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import { convertFromMapDefinition } from '../../utils/DataMap.Utils';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import * as yaml from 'js-yaml';

export interface DataMapState {
  curDataMapOperation: DataMapOperationState;
  pristineDataMap: DataMapOperationState;
  isDirty: boolean;
  undoStack: DataMapOperationState[];
  redoStack: DataMapOperationState[];
}

export interface DataMapOperationState {
  dataMapConnections: ConnectionDictionary;
  inputSchema?: SchemaExtended;
  flattenedInputSchema: SchemaNodeDictionary;
  outputSchema?: SchemaExtended;
  flattenedOutputSchema: SchemaNodeDictionary;
  currentInputNodes: SchemaNodeExtended[];
  currentOutputNode?: SchemaNodeExtended;
  currentlySelectedNode?: SelectedNode;
}

const emptyPristineState: DataMapOperationState = {
  dataMapConnections: {},
  currentInputNodes: [],
  flattenedInputSchema: {},
  flattenedOutputSchema: {},
};
const initialState: DataMapState = {
  pristineDataMap: emptyPristineState,
  curDataMapOperation: emptyPristineState,
  isDirty: false,
  undoStack: [],
  redoStack: [],
};

export interface ConnectionAction {
  outputNodeKey: string;
  value: string;
}

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    setInitialSchema: (
      state,
      action: PayloadAction<{
        schema: SchemaExtended;
        schemaType: SchemaTypes.Input | SchemaTypes.Output;
        flattenedSchema: SchemaNodeDictionary;
      }>
    ) => {
      if (action.payload.schemaType === SchemaTypes.Input) {
        state.curDataMapOperation.inputSchema = action.payload.schema;
        state.curDataMapOperation.flattenedInputSchema = action.payload.flattenedSchema;
        state.pristineDataMap.inputSchema = action.payload.schema;
        state.pristineDataMap.flattenedInputSchema = action.payload.flattenedSchema;
      } else {
        state.curDataMapOperation.outputSchema = action.payload.schema;
        state.curDataMapOperation.flattenedOutputSchema = action.payload.flattenedSchema;
        state.curDataMapOperation.currentOutputNode = action.payload.schema.schemaTreeRoot;
        state.pristineDataMap.outputSchema = action.payload.schema;
        state.pristineDataMap.flattenedOutputSchema = action.payload.flattenedSchema;
        state.pristineDataMap.currentOutputNode = action.payload.schema.schemaTreeRoot;
      }
    },

    // TODO: See if possible to set a better type for PayloadAction below (dataMapDefinition obj)
    setInitialDataMap: (state, action: PayloadAction<any | undefined>) => {
      const incomingDataMap = action.payload;
      const currentState = state.curDataMapOperation;

      if (currentState.inputSchema && currentState.outputSchema) {
        let newState: DataMapOperationState = {
          ...currentState,
          dataMapConnections: {},
          currentInputNodes: [],
          currentOutputNode: currentState.outputSchema.schemaTreeRoot,
        };

        if (incomingDataMap) {
          const loadedConnections = convertFromMapDefinition(yaml.dump(incomingDataMap));
          const topLevelInputNodes: SchemaNodeExtended[] = [];

          Object.entries(loadedConnections).forEach(([_key, con]) => {
            // TODO: Only push input nodes at TOP-LEVEL of output
            topLevelInputNodes.push(currentState.flattenedInputSchema[con.reactFlowSource]);
          });

          newState = {
            ...currentState,
            currentInputNodes: topLevelInputNodes,
            dataMapConnections: loadedConnections,
          };
        }

        state.curDataMapOperation = newState;
        state.pristineDataMap = newState;
      }
    },

    changeInputSchema: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;

      if (incomingDataMapOperation) {
        state.curDataMapOperation = incomingDataMapOperation;
        state.isDirty = true;
        state.undoStack = [];
        state.redoStack = [];
      }
    },

    changeOutputSchema: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;
      if (incomingDataMapOperation) {
        state.curDataMapOperation = incomingDataMapOperation;
        state.isDirty = true;
        state.undoStack = [];
        state.redoStack = [];
      }
    },

    setCurrentInputNodes: (state, action: PayloadAction<SchemaNodeExtended[] | undefined>) => {
      let nodes: SchemaNodeExtended[] = [];
      if (action.payload) {
        const uniqueNodes = state.curDataMapOperation.currentInputNodes.concat(action.payload).filter((node, index, self) => {
          return self.findIndex((subNode) => subNode.key === node.key) === index;
        });

        nodes = uniqueNodes;
      }

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentInputNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },

    addInputNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      const nodes = [...state.curDataMapOperation.currentInputNodes];
      action.payload.forEach((payloadNode) => {
        const existingNode = state.curDataMapOperation.currentInputNodes.find((currentNode) => currentNode.key === payloadNode.key);
        if (!existingNode) {
          nodes.push(payloadNode);
        }
      });

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentInputNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },

    removeInputNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      let nodes = [...state.curDataMapOperation.currentInputNodes];
      nodes = state.curDataMapOperation.currentInputNodes.filter((currentNode) =>
        action.payload.every((payloadNode) => payloadNode.key !== currentNode.key)
      );

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentInputNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },

    toggleInputNode: (state, action: PayloadAction<SchemaNodeExtended>) => {
      let nodes = [...state.curDataMapOperation.currentInputNodes];
      const existingNode = state.curDataMapOperation.currentInputNodes.find((currentNode) => currentNode.key === action.payload.key);
      if (existingNode) {
        nodes = state.curDataMapOperation.currentInputNodes.filter((currentNode) => currentNode.key !== action.payload.key);
      } else {
        nodes.push(action.payload);
      }

      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentInputNodes: nodes,
      };

      doDataMapOperation(state, newState);
    },

    setCurrentOutputNode: (state, action: PayloadAction<{ schemaNode: SchemaNodeExtended; resetSelectedInputNodes: boolean }>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentOutputNode: action.payload.schemaNode,
        currentInputNodes: action.payload.resetSelectedInputNodes ? [] : state.curDataMapOperation.currentInputNodes,
      };

      doDataMapOperation(state, newState);
    },

    setCurrentlySelectedNode: (state, action: PayloadAction<SelectedNode | undefined>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentlySelectedNode: action.payload,
      };

      doDataMapOperation(state, newState);
    },

    makeConnection: (state, action: PayloadAction<ConnectionAction>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        dataMapConnections: { ...state.curDataMapOperation.dataMapConnections },
      };

      const trimmedKey = action.payload.outputNodeKey.split('-', 2)[1];
      const trimmedValue = action.payload.value.split('-', 2)[1];

      newState.dataMapConnections[trimmedKey] = {
        value: trimmedValue,
        reactFlowSource: action.payload.value,
        reactFlowDestination: action.payload.outputNodeKey,
      };

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
      action: PayloadAction<{ inputSchemaExtended: SchemaExtended | undefined; outputSchemaExtended: SchemaExtended | undefined }>
    ) => {
      const inputSchemaExtended = action.payload.inputSchemaExtended;
      const outputSchemaExtended = action.payload.outputSchemaExtended;
      if (state.curDataMapOperation) {
        state.curDataMapOperation.inputSchema = inputSchemaExtended;
        state.curDataMapOperation.outputSchema = outputSchemaExtended;
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
  changeInputSchema,
  changeOutputSchema,
  setCurrentInputNodes,
  addInputNodes,
  removeInputNodes,
  toggleInputNode,
  setCurrentOutputNode,
  setCurrentlySelectedNode,
  makeConnection,
  undoDataMapOperation,
  redoDataMapOperation,
  saveDataMap,
  discardDataMap,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;

const doDataMapOperation = (state: DataMapState, newCurrentState: DataMapOperationState) => {
  state.undoStack = state.undoStack.slice(-19);
  state.undoStack.push(state.curDataMapOperation);
  state.curDataMapOperation = newCurrentState;
  state.redoStack = [];
  state.isDirty = true;
};
