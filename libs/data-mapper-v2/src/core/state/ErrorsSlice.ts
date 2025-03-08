import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { MapIssue } from '../../utils/MapChecker.Utils';

export interface ErrorsState {
  deserializationMessages: MapIssue[];
}

export const initialFunctionState: ErrorsState = {
  deserializationMessages: [],
};

export const errorsSlice = createSlice({
  name: 'errors',
  initialState: initialFunctionState,
  reducers: {
    updateDeserializationMessages: (state, action: PayloadAction<MapIssue[]>) => {
      state.deserializationMessages = action.payload;
    },
  },
});

export const { updateDeserializationMessages } = errorsSlice.actions;

export default errorsSlice.reducer;
