import type { JsonInputStyle, SchemaNodeExtended } from '../../models';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface DataMapState {
  curDataMapOperation?: DataMapOperationState;
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
}

const initialState: DataMapState = { isDirty: false, undoStack: [], redoStack: [] };

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    //TODO: remove below - just for debugging
    removeCurDataMap: (state) => {
      state.curDataMapOperation = undefined;
    },

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
        // TODO: set currentInputNode and currentOutputNode => dispatch calls
        state.isDirty = true;
      }
    },

    redoDataMapOperation: (state) => {
      const lastDataMap = state.redoStack.pop();

      if (lastDataMap && state.curDataMapOperation) {
        state.undoStack.push(state.curDataMapOperation);
        state.curDataMapOperation = lastDataMap;
        // TODO: set currentInputNode and currentOutputNode => dispatch calls
        state.isDirty = true;
      }
    },

    saveDataMap: (
      state
      // action: PayloadAction<{inputSchemaExtended: SchemaExtended | undefined, outputSchemaExtended: SchemaExtended | undefined}>
    ) => {
      // TODO: consider those below => IMPORTANT FOR DISCARD
      // const inputSchemaExtended = action.payload.inputSchemaExtended;
      // const outputSchemaExtended = action.payload.outputSchemaExtended;

      // TODO: API call for save, then upon successful callback => maybe this shouldn't be done here
      state.pristineDataMap = state.curDataMapOperation;
      // state.pristineDataMap.oldInputSchema = inputSchemaExtended;
      state.isDirty = false;

      // TODO: upon non-successful callback, isDirty doesn't change. nothing chnages.
    },

    discardDataMap: (state) => {
      // doDataMapOperation(state.pristineDataMap); // TO BE DELETED
      state.curDataMapOperation = state.pristineDataMap;
      // TODO: change the currentInput and currentOutput
      state.undoStack = [];
      state.redoStack = [];
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
