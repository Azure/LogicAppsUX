import type { MapDefDropdownOption } from '../components/DevToolbox';
import type { RootState } from './Store';
import type { FunctionData } from '@microsoft/logic-apps-data-mapper';
import { functionMock, loadMapDefinition } from '@microsoft/logic-apps-data-mapper';
import type { MapDefinitionEntry, MapMetadata } from '@microsoft/logic-apps-shared';
import { Theme as ThemeType } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { testMetadata } from '../mapMetadata';

export const LoadingMethod = {
  File: 'file',
  Arm: 'arm',
} as const;
export type LoadingMethod = (typeof LoadingMethod)[keyof typeof LoadingMethod];

export type DmVersions = 'v1' | 'v2';

export interface DataMapLoadingState {
  theme: ThemeType;
  armToken?: string;
  rawDefinition?: MapDefDropdownOption;
  loadingMethod: LoadingMethod;
  mapDefinition: MapDefinitionEntry;
  mapMetadata?: MapMetadata;
  xsltFilename: string;
  xsltContent: string;
  fetchedFunctions?: FunctionData[];
  customXsltPaths: string[];
}

const mockMetadata: MapMetadata = testMetadata;

const initialState: DataMapLoadingState = {
  theme: ThemeType.Light,
  loadingMethod: LoadingMethod.File,
  mapDefinition: {},
  xsltFilename: '',
  xsltContent: '',
  fetchedFunctions: [...functionMock],
  customXsltPaths: ['folder/file.xslt', 'file2.xslt'],
  mapMetadata: mockMetadata,
};

export const loadDataMap = createAsyncThunk('loadDataMap', async (_: unknown, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;

  // TODO ARM loading
  if (currentState.dataMapDataLoader.loadingMethod === LoadingMethod.Arm) {
    return null;
  }
  try {
    const mapDefinition = loadMapDefinition(currentState.dataMapDataLoader.rawDefinition?.data?.mapDefinitionString ?? '');
    return mapDefinition;
  } catch {
    return null;
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
    changeXsltContent: (state, action: PayloadAction<string>) => {
      state.xsltContent = action.payload;
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
