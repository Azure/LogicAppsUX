import type { FunctionData } from '../../models/Function';
import type { PayloadAction, Reducer } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface FunctionState {
  availableFunctions: FunctionData[];
  customXsltFilePaths: string[];
}

export const initialFunctionState: FunctionState = {
  availableFunctions: [],
  customXsltFilePaths: [],
};

type Reducers = {
  loadFunctions: (state: FunctionState, action: PayloadAction<FunctionData[]>) => void;
  loadCustomXsltFilePaths: (state: FunctionState, action: PayloadAction<string[]>) => void;
};

export const functionSlice = createSlice<FunctionState, Reducers, 'function', any>({
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

const functionReducer: Reducer<FunctionState> = functionSlice.reducer;
export default functionReducer;
