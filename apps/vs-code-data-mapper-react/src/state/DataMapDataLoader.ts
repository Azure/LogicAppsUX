import type { MapDefinitionEntry, Schema } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DataMapLoadingState {
  armToken?: string;
  loadingMethod: 'file' | 'arm';
  mapDefinition?: MapDefinitionEntry;
  sourceSchema?: Schema;
  targetSchema?: Schema;
  schemaFileList?: string[];
  xsltFilename: string;
}

const initialState: DataMapLoadingState = {
  loadingMethod: 'file',
  xsltFilename: '',
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
    changeXsltFilename: (state, action: PayloadAction<string>) => {
      state.xsltFilename = action.payload;
    },
    changeMapDefinition: (state, action: PayloadAction<MapDefinitionEntry>) => {
      state.mapDefinition = action.payload;
    },
    changeSourceSchema: (state, action: PayloadAction<Schema>) => {
      state.sourceSchema = action.payload;
    },
    changeTargetSchema: (state, action: PayloadAction<Schema>) => {
      state.targetSchema = action.payload;
    },
    changeSchemaList: (state, action: PayloadAction<string[]>) => {
      state.schemaFileList = action.payload;
    },
  },
});
