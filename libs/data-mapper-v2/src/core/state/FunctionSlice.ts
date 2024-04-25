import type { FunctionData } from '../../models/Function';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface FunctionState {
  availableFunctions: FunctionData[];
  customXsltFilePaths: string[];
}

export const initialFunctionState: FunctionState = {
  availableFunctions: [],
  customXsltFilePaths: [],
};

export const functionSlice = createSlice({
  name: 'function',
  initialState: initialFunctionState,
  reducers: {
    loadFunctions: (state, action: PayloadAction<FunctionData[]>) => {
      state.availableFunctions = action.payload;
    },
    loadCustomXsltFilePaths: (state, action: PayloadAction<string[]>) => {
      state.customXsltFilePaths = action.payload;
    },
  },
});

export const { loadFunctions, loadCustomXsltFilePaths } = functionSlice.actions;

export default functionSlice.reducer;
