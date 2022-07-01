import type { JsonInputStyle, SchemaExtended, SchemaNodeExtended } from '../../models';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface DataMapState {
  curDataMapOperation?: DataMapOperationState;
  pristineDataMap?: DataMapOperationState;
  isDirty: boolean;

  undoStack: DataMapOperationState[];
  redoStack: DataMapOperationState[];
}

export interface DataMapOperationState {
  curDataMap: JsonInputStyle;
  currentInputSchemaExtended?: SchemaExtended;
  currentOutputSchemaExtended?: SchemaExtended;
  currentInputNode?: SchemaNodeExtended;
  currentOutputNode?: SchemaNodeExtended;
}

const initialState: DataMapState = { isDirty: false, undoStack: [], redoStack: [] };

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    changeInputSchemaOperation: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;

      if (incomingDataMapOperation) {
        state.curDataMapOperation = incomingDataMapOperation;
        state.isDirty = true;
        state.undoStack = [];
        state.redoStack = [];
      }
    },

    changeOutputSchemaOperation: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;
      if (incomingDataMapOperation) {
        state.curDataMapOperation = incomingDataMapOperation;
        state.isDirty = true;
        state.undoStack = [];
        state.redoStack = [];
      }
    },

    doDataMapOperation: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;
      if (incomingDataMapOperation) {
        if (state.curDataMapOperation) {
          state.undoStack = state.undoStack.slice(-19);
          state.undoStack.push(state.curDataMapOperation);
        }
        state.curDataMapOperation = incomingDataMapOperation;
        state.redoStack = [];
        state.isDirty = true;
      }
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
        state.curDataMapOperation.currentInputSchemaExtended = inputSchemaExtended;
        state.curDataMapOperation.currentOutputSchemaExtended = outputSchemaExtended;
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
  changeInputSchemaOperation,
  changeOutputSchemaOperation,
  doDataMapOperation,
  undoDataMapOperation,
  redoDataMapOperation,
  saveDataMap,
  discardDataMap,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;
