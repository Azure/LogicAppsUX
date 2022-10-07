import type { FunctionData } from '../../models/Function';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface FunctionState {
  availableFunctions: FunctionData[];
}

export const initialFunctionState: FunctionState = {
  availableFunctions: [],
};

export const functionSlice = createSlice({
  name: 'function',
  initialState: initialFunctionState,
  reducers: {
    loadFunctions: (state, action: PayloadAction<FunctionData[]>) => {
      state.availableFunctions = action.payload;
    },
  },
});

export const { loadFunctions } = functionSlice.actions;

export default functionSlice.reducer;
