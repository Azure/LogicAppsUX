import type { MapDefDropdownOption } from '../components/DevToolbox';
import type { RootState } from './Store';
import type { FunctionData, MapDefinitionEntry, MapMetadata } from '@microsoft/logic-apps-data-mapper';
import { functionMock, loadMapDefinition } from '@microsoft/logic-apps-data-mapper';
import { Theme as ThemeType } from '@microsoft/utils-logic-apps';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

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
  mapMetadata?: MapMetadata;
  xsltFilename: string;
  xsltContent: string;
  fetchedFunctions?: FunctionData[];
  customFunctionPaths: string[];
}

const initialState: DataMapLoadingState = {
  theme: ThemeType.Light,
  loadingMethod: LoadingMethod.File,
  mapDefinition: {},
  xsltFilename: '',
  xsltContent: '',
  fetchedFunctions: [...functionMock],
  customFunctionPaths: ['folder/file.xslt', 'file2.xslt'],
};

export const loadDataMap = createAsyncThunk('loadDataMap', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;

  // TODO ARM loading
  if (currentState.dataMapDataLoader.loadingMethod === LoadingMethod.Arm) {
    return null;
  } else {
    try {
      const mapDefinition = loadMapDefinition(currentState.dataMapDataLoader.rawDefinition?.data?.mapDefinitionString ?? '');
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
      state.mapMetadata = JSON.parse(action.payload.data?.mapMetadataString || '');
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
