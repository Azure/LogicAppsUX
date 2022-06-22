import type { JsonInputStyle } from '../../models';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface DataMapState {
  curDataMap?: JsonInputStyle;
  pristineDataMap?: JsonInputStyle;
  isDirty: boolean;

  // TODO: keep the limit to 20
  undoStack: JsonInputStyle[];
  redoStack: JsonInputStyle[];
}

const initialState: DataMapState = { isDirty: false, undoStack: [], redoStack: [] };

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    setDataMapState: (state, action: PayloadAction<JsonInputStyle | undefined>) => {
      const incomingDataMap = action.payload;
      if (incomingDataMap) {
        state.curDataMap = incomingDataMap;
        state.isDirty = true;
        state.undoStack.push(incomingDataMap);
        // TODO - redoStack?
      }
    },

    saveDataMapState: (state) => {
      state.curDataMap = state.pristineDataMap;
      state.isDirty = false;
    },
  },
});

export const { setDataMapState } = dataMapSlice.actions;

export default dataMapSlice.reducer;
