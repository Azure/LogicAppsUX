import type { JsonInputStyle, SchemaExtended, SchemaNodeExtended } from '../../models';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface DataMapState {
  curDataMap?: DataMapOperationState;
  pristineDataMap?: DataMapOperationState;
  isDirty: boolean;

  // TODO: keep the limit to 20
  undoStack: DataMapOperationState[];
  redoStack: DataMapOperationState[];
}

export interface DataMapOperationState {
  curDataMap: JsonInputStyle;
  currentInputNode?: SchemaNodeExtended;
  currentOutputNode?: SchemaNodeExtended;

  isInputSchemaChanged?: boolean;
  oldInputSchema?: SchemaExtended;
  isOutputSchemaChanged?: boolean;
  oldOutputSchema?: SchemaExtended;
}

const initialState: DataMapState = { isDirty: false, undoStack: [], redoStack: [] };

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    //TODO: remove below - just for debugging
    removeCurDataMap: (state) => {
      state.curDataMap = undefined;
    },

    changeInputSchemaOperation: (
      state,
      action: PayloadAction<{ incomingDataMapOperation: DataMapOperationState | undefined; oldInputSchema: SchemaExtended | undefined }>
    ) => {
      const incomingDataMapOperation = action.payload.incomingDataMapOperation;
      const oldInputSchema = action.payload.oldInputSchema;

      if (incomingDataMapOperation && state.curDataMap) {
        state.curDataMap.isInputSchemaChanged = true;
        state.curDataMap.oldInputSchema = oldInputSchema;
        doDataMapOperation(incomingDataMapOperation);
      }
    },

    changeOutputSchemaOperation: (
      state,
      action: PayloadAction<{ incomingDataMapOperation: DataMapOperationState | undefined; oldOutputSchema: SchemaExtended | undefined }>
    ) => {
      const incomingDataMapOperation = action.payload.incomingDataMapOperation;
      const oldOutputSchema = action.payload.oldOutputSchema;

      if (incomingDataMapOperation && state.curDataMap) {
        state.curDataMap.isOutputSchemaChanged = true;
        state.curDataMap.oldOutputSchema = oldOutputSchema;
        doDataMapOperation(incomingDataMapOperation);
      }
    },

    doDataMapOperation: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;
      if (incomingDataMapOperation) {
        if (state.curDataMap) {
          state.undoStack.push(state.curDataMap);
        }
        state.curDataMap = incomingDataMapOperation;
        state.redoStack = [];
        state.isDirty = true;
      }
    },

    undoDataMapOperation: (state) => {
      const lastDataMap = state.undoStack.pop();

      if (lastDataMap && state.curDataMap) {
        state.redoStack.push(state.curDataMap);
        state.curDataMap = lastDataMap;
        // TODO: set currentInputNode and currentOutputNode => dispatch calls
        state.isDirty = true;
      }
    },

    redoDataMapOperation: (state) => {
      const lastDataMap = state.redoStack.pop();

      if (lastDataMap && state.curDataMap) {
        state.undoStack.push(state.curDataMap);
        state.curDataMap = lastDataMap;
        // TODO: set currentInputNode and currentOutputNode => dispatch calls
        state.isDirty = true;
      }
    },

    saveDataMap: (
      state
      // action: PayloadAction<{inputSchemaExtended: SchemaExtended | undefined, outputSchemaExtended: SchemaExtended | undefined}>
    ) => {
      // TODO: consider those below
      // const inputSchemaExtended = action.payload.inputSchemaExtended;
      // const outputSchemaExtended = action.payload.outputSchemaExtended;

      // TODO: API call for save, then upon successful callback => maybe this shouldn't be done here
      state.pristineDataMap = state.curDataMap;
      // state.pristineDataMap.oldInputSchema = inputSchemaExtended;
      state.isDirty = false;

      // TODO: upon non-successful callback, isDirty doesn't change. nothing chnages.
    },

    discardDataMap: (state) => {
      doDataMapOperation(state.pristineDataMap);
      state.isDirty = false;
    },
  },
});

export const {
  removeCurDataMap,
  changeInputSchemaOperation,
  changeOutputSchemaOperation,
  doDataMapOperation,
  undoDataMapOperation,
  redoDataMapOperation,
  saveDataMap,
  discardDataMap,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;
