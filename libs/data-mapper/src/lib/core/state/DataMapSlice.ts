import type { JsonInputStyle } from '../../models';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface DataMapState {
  dataMap?: JsonInputStyle;
  // TODO: discuss about undo or redo stack
}

const initialState: DataMapState = {};

export const dataMapSlice = createSlice({
  name: 'dataMap',
  initialState,
  reducers: {
    setDataMapState: (state, action: PayloadAction<JsonInputStyle | undefined>) => {
      const incomingDataMap = action.payload;
      if (incomingDataMap) {
        state.dataMap = incomingDataMap;
      }
    },
  },
});

export const { setDataMapState } = dataMapSlice.actions;

export default dataMapSlice.reducer;
