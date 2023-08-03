import type { FunctionData } from '../../models/Function';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface FunctionState {
  availableFunctions: FunctionData[];
  customFunctionPaths: string[];
}

export const initialFunctionState: FunctionState = {
  availableFunctions: [],
  customFunctionPaths: [],
};

export const functionSlice = createSlice({
  name: 'function',
  initialState: initialFunctionState,
  reducers: {
    loadFunctions: (state, action: PayloadAction<FunctionData[]>) => {
      state.availableFunctions = action.payload;
    },
    loadCustomFunctionPaths: (state, action: PayloadAction<string[]>) => {
      state.customFunctionPaths = action.payload;
    },
  },
});

export const { loadFunctions, loadCustomFunctionPaths } = functionSlice.actions;

export default functionSlice.reducer;
