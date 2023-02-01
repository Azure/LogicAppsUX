import type { MapDefDropdownOption } from '../components/DevToolbox';
import type { RootState } from './Store';
import { functionMock } from '@microsoft/logic-apps-data-mapper';
import type { MapDefinitionEntry, FunctionData } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as yaml from 'js-yaml';

export type ThemeType = 'Light' | 'Dark';

export enum LoadingMethod {
  File = 'file',
  Arm = 'arm',
}

export interface DataMapLoadingState {
  theme: ThemeType;
  armToken?: string;
  rawDefinition?: MapDefDropdownOption;
  loadingMethod: LoadingMethod;
  mapDefinition: MapDefinitionEntry;
  xsltFilename: string;
  fetchedFunctions?: FunctionData[];
}

const initialState: DataMapLoadingState = {
  theme: 'Light',
  loadingMethod: LoadingMethod.File,
  mapDefinition: {},
  xsltFilename: '',
  fetchedFunctions: [...functionMock],
};

export const loadDataMap = createAsyncThunk('loadDataMap', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;

  // TODO ARM loading
  if (currentState.dataMapDataLoader.loadingMethod === LoadingMethod.Arm) {
    return null;
  } else {
    try {
      const mapDefinition = yaml.load(currentState.dataMapDataLoader.rawDefinition?.data?.mapDefinitionString ?? '') as MapDefinitionEntry;
      return mapDefinition;
    } catch {
      return null;
    }
  }
});

export const dataMapDataLoaderSlice = createSlice({
  name: 'dataMapDataLoader',
  initialState,
  reducers: {
    changeTheme: (state, action: PayloadAction<ThemeType>) => {
      state.theme = action.payload;
    },
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeRawDefinition: (state, action: PayloadAction<MapDefDropdownOption>) => {
      state.rawDefinition = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<LoadingMethod>) => {
      state.loadingMethod = action.payload;
    },
    changeXsltFilename: (state, action: PayloadAction<string>) => {
      state.xsltFilename = action.payload;
    },
    changeFetchedFunctions: (state, action: PayloadAction<FunctionData[]>) => {
      state.fetchedFunctions = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadDataMap.fulfilled, (state, action) => {
      state.mapDefinition = action.payload || {};
    });

    builder.addCase(loadDataMap.rejected, (state) => {
      // TODO change to null for error handling case
      state.mapDefinition = {};
    });
  },
});
