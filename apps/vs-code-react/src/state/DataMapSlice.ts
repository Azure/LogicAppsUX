import type { FunctionData } from '@microsoft/logic-apps-data-mapper';
import type { DataMapSchema, MapDefinitionEntry, MapMetadata } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface DataMapState {
  dataMapperVersion?: number;

  runtimePort?: string;
  armToken?: string;
  loadingMethod: 'file' | 'arm';
  mapDefinition?: MapDefinitionEntry;
  dataMapMetadata?: MapMetadata;

  sourceSchemaFilename?: string;
  sourceSchema?: DataMapSchema;
  targetSchemaFilename?: string;
  targetSchema?: DataMapSchema;
  schemaFileList?: string[];
  customXsltPathsList?: string[];
  xsltFilename: string;
  xsltContent: string;
  fetchedFunctions?: FunctionData[];
  useExpandedFunctionCards: boolean;
}

const initialState: DataMapState = {
  loadingMethod: 'file',
  xsltFilename: '',
  xsltContent: '',
  useExpandedFunctionCards: true,
};

export const dataMapSlice = createSlice({
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
    changeSourceSchema: (state, action: PayloadAction<DataMapSchema>) => {
      state.sourceSchema = action.payload;
    },
    changeTargetSchemaFilename: (state, action: PayloadAction<string>) => {
      state.targetSchemaFilename = action.payload;
    },
    changeTargetSchema: (state, action: PayloadAction<DataMapSchema>) => {
      state.targetSchema = action.payload;
    },
    changeSchemaList: (state, action: PayloadAction<string[]>) => {
      state.schemaFileList = action.payload;
    },
    changeCustomXsltPathList: (state, action: PayloadAction<string[]>) => {
      state.customXsltPathsList = action.payload;
    },
    changeFetchedFunctions: (state, action: PayloadAction<FunctionData[]>) => {
      state.fetchedFunctions = action.payload;
    },
    changeUseExpandedFunctionCards: (state, action: PayloadAction<boolean>) => {
      state.useExpandedFunctionCards = action.payload;
    },
    changeDataMapperVersion: (state, action: PayloadAction<number>) => {
      state.dataMapperVersion = action.payload;
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
  changeCustomXsltPathList,
  changeFetchedFunctions,
  changeUseExpandedFunctionCards,
  changeDataMapperVersion,
} = dataMapSlice.actions;

export default dataMapSlice.reducer;
