import type { FunctionData, MapDefinitionEntry, MapMetadata, Schema } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DataMapLoadingState {
  runtimePort?: string;
  armToken?: string;
  loadingMethod: 'file' | 'arm';
  mapDefinition?: MapDefinitionEntry;
  dataMapMetadata?: MapMetadata;

  sourceSchemaFilename?: string;
  sourceSchema?: Schema;
  targetSchemaFilename?: string;
  targetSchema?: Schema;
  schemaFileList?: string[];
  customFunctionFileList?: string[];
  xsltFilename: string;
  xsltContent: string;
  fetchedFunctions?: FunctionData[];
  useExpandedFunctionCards: boolean;
}

const initialState: DataMapLoadingState = {
  loadingMethod: 'file',
  xsltFilename: '',
  xsltContent: '',
  useExpandedFunctionCards: true,
};

export const dataMapDataLoaderSlice = createSlice({
  name: 'dataMapDataLoader',
  initialState,
  reducers: {
    changeRuntimePort: (state, action: PayloadAction<string>) => {
      state.runtimePort = action.payload;
    },
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
    },
    changeXsltFilename: (state, action: PayloadAction<string>) => {
      state.xsltFilename = action.payload;
    },
    changeXsltContent: (state, action: PayloadAction<string>) => {
      state.xsltContent = action.payload;
    },
    changeMapDefinition: (state, action: PayloadAction<MapDefinitionEntry>) => {
      state.mapDefinition = action.payload;
    },
    changeDataMapMetadata: (state, action: PayloadAction<MapMetadata | undefined>) => {
      state.dataMapMetadata = action.payload;
    },
    changeSourceSchemaFilename: (state, action: PayloadAction<string>) => {
      state.sourceSchemaFilename = action.payload;
    },
    changeSourceSchema: (state, action: PayloadAction<Schema>) => {
      state.sourceSchema = action.payload;
    },
    changeTargetSchemaFilename: (state, action: PayloadAction<string>) => {
      state.targetSchemaFilename = action.payload;
    },
    changeTargetSchema: (state, action: PayloadAction<Schema>) => {
      state.targetSchema = action.payload;
    },
    changeSchemaList: (state, action: PayloadAction<string[]>) => {
      state.schemaFileList = action.payload;
    },
    changeCustomFunctionList: (state, action: PayloadAction<string[]>) => {
      state.customFunctionFileList = action.payload;
    },
    changeFetchedFunctions: (state, action: PayloadAction<FunctionData[]>) => {
      state.fetchedFunctions = action.payload;
    },
    changeUseExpandedFunctionCards: (state, action: PayloadAction<boolean>) => {
      state.useExpandedFunctionCards = action.payload;
    },
  },
});

export const {
  changeRuntimePort,
  changeArmToken,
  changeLoadingMethod,
  changeXsltFilename,
  changeXsltContent,
  changeMapDefinition,
  changeDataMapMetadata,

  changeSourceSchemaFilename,
  changeSourceSchema,
  changeTargetSchemaFilename,
  changeTargetSchema,
  changeSchemaList,
  changeCustomFunctionList,
  changeFetchedFunctions,
  changeUseExpandedFunctionCards,
} = dataMapDataLoaderSlice.actions;

export default dataMapDataLoaderSlice.reducer;
