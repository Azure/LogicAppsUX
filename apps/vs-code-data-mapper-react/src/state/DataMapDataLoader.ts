import type { DataMap, Schema } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DataMapLoadingState {
  armToken?: string;
  loadingMethod: 'file' | 'arm';
  dataMap?: DataMap;
  inputSchema?: Schema;
  outputSchema?: Schema;
  schemaFileList?: string[];
}

const initialState: DataMapLoadingState = {
  loadingMethod: 'file',
};

export const dataMapDataLoaderSlice = createSlice({
  name: 'dataMapDataLoader',
  initialState,
  reducers: {
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
    },
    changeDataMap: (state, action: PayloadAction<DataMap>) => {
      state.dataMap = action.payload;
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
