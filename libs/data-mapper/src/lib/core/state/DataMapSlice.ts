import type { SchemaExtended, SchemaNodeExtended, SelectedNode } from '../../models';
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
  dataMapConnections: { [key: string]: string };
  inputSchema?: SchemaExtended;
  outputSchema?: SchemaExtended;
  currentInputNodes: SchemaNodeExtended[];
  currentOutputNode?: SchemaNodeExtended;
  currentlySelectedNode?: SelectedNode;
}

const emptyPristineState: DataMapOperationState = { dataMapConnections: {}, currentInputNodes: [] };
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
    setInitialInputSchema: (state, action: PayloadAction<SchemaExtended>) => {
      state.curDataMapOperation.inputSchema = action.payload;
      state.pristineDataMap.inputSchema = action.payload;
    },

    setInitialOutputSchema: (state, action: PayloadAction<SchemaExtended>) => {
      state.curDataMapOperation.outputSchema = action.payload;
      state.curDataMapOperation.currentOutputNode = action.payload.schemaTreeRoot;
      state.pristineDataMap.outputSchema = action.payload;
      state.pristineDataMap.currentOutputNode = action.payload.schemaTreeRoot;
    },

    setInitialDataMap: (state) => {
      const currentState = state.curDataMapOperation;
      if (currentState.inputSchema && currentState.outputSchema) {
        const newInitialState: DataMapOperationState = {
          ...currentState,
          dataMapConnections: {},
          currentInputNodes: [],
          currentOutputNode: currentState.currentOutputNode || currentState.outputSchema.schemaTreeRoot,
        };

        state.curDataMapOperation = newInitialState;
        state.pristineDataMap = newInitialState;
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

    setCurrentOutputNode: (state, action: PayloadAction<SchemaNodeExtended>) => {
      const newState: DataMapOperationState = {
        ...state.curDataMapOperation,
        currentOutputNode: action.payload,
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

      newState.dataMapConnections[action.payload.outputNodeKey] = action.payload.value;

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
  setInitialInputSchema,
  setInitialOutputSchema,
  setInitialDataMap,
  changeInputSchema,
  changeOutputSchema,
  setCurrentInputNodes,
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
