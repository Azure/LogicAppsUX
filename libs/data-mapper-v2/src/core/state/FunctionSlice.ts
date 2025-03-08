import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';
import type { FunctionData } from '../../models/Function';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface FunctionState {
  availableFunctions: FunctionData[];
  customXsltFilePaths: IFileSysTreeItem[];
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
    loadCustomXsltFilePaths: (state, action: PayloadAction<IFileSysTreeItem[]>) => {
      state.customXsltFilePaths = action.payload;
    },
  },
});

export const { loadFunctions, loadCustomXsltFilePaths } = functionSlice.actions;

export default functionSlice.reducer;
