import type { Schema } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface SchemaLoadingState {
  armToken?: string;
  loadingMethod: 'file' | 'arm';
  inputSchema?: Schema;
  outputSchema?: Schema;
  schemaFileList?: string[];
}

const initialState: SchemaLoadingState = {
  loadingMethod: 'file',
};

export const schemaDataLoaderSlice = createSlice({
  name: 'schema',
  initialState,
  reducers: {
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
    },
    changeInputSchema: (state, action: PayloadAction<Schema>) => {
      state.inputSchema = action.payload;
    },
    changeOutputSchema: (state, action: PayloadAction<Schema>) => {
      state.outputSchema = action.payload;
    },
    changeSchemaList: (state, action: PayloadAction<string[]>) => {
      state.schemaFileList = action.payload;
    },
  },
});
