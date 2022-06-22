import type { JsonInputStyle, SchemaNodeExtended } from '../../models';
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
}

const initialState: DataMapState = { isDirty: false, undoStack: [], redoStack: [] };

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    doDataMapOperation: (state, action: PayloadAction<DataMapOperationState | undefined>) => {
      const incomingDataMapOperation = action.payload;
      if (incomingDataMapOperation) {
        state.curDataMap = incomingDataMapOperation;
        state.undoStack.push(incomingDataMapOperation);
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

    saveDataMap: (state) => {
      // TODO: API call for save, then upon successful callback
      state.pristineDataMap = state.curDataMap;
      state.isDirty = false;

      // TODO: upon non-successful callback, isDirty doesn't change. nothing chnages.
    },

    discardDataMap: (state) => {
      doDataMapOperation(state.pristineDataMap);
      state.isDirty = false;
    },
  },
});

export const { doDataMapOperation, undoDataMapOperation, redoDataMapOperation, saveDataMap, discardDataMap } = dataMapSlice.actions;

export default dataMapSlice.reducer;
