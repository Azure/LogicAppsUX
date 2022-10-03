import type { RootState } from './Store';
import type { MapDefinitionEntry } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import * as yaml from 'js-yaml';

export type ThemeType = 'Light' | 'Dark';

export interface DataMapLoadingState {
  theme: ThemeType;
  armToken?: string;
  rawDefinition: string;
  loadingMethod: 'file' | 'arm';
  mapDefinition: MapDefinitionEntry;
  xsltFilename: string;
}

const initialState: DataMapLoadingState = {
  theme: 'Light',
  loadingMethod: 'file',
  rawDefinition: '',
  mapDefinition: {},
  xsltFilename: '',
};

export const loadDataMap = createAsyncThunk('loadDataMap', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;

  // TODO ARM loading
  if (currentState.dataMapDataLoader.loadingMethod === 'arm') {
    return null;
  } else {
    try {
      const mapDefinition = yaml.load(currentState.dataMapDataLoader.rawDefinition) as MapDefinitionEntry;
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
    changeRawDefinition: (state, action: PayloadAction<string>) => {
      state.rawDefinition = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
    },
    changeXsltFilename: (state, action: PayloadAction<string>) => {
      state.xsltFilename = action.payload;
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
