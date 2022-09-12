import type { RootState } from './Store';
import type { DataMap } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface DataMapLoadingState {
  theme: string;
  armToken?: string;
  resourcePath?: string;
  loadingMethod: 'file' | 'arm';
  dataMap?: DataMap;
}

const initialState: DataMapLoadingState = {
  theme: 'Light',
  loadingMethod: 'file',
  resourcePath: '',
};

// TODO (Not immediately urgent 8/31): Come through and update these data map/schema formats
export const loadDataMap = createAsyncThunk('loadDataMap', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;

  // TODO ARM loading
  if (currentState.dataMapDataLoader.loadingMethod === 'arm') {
    return null;
  } else {
    try {
      const dataMap = await import(`../../../../__mocks__/dataMaps/${currentState.dataMapDataLoader.resourcePath}`);
      return dataMap;
    } catch {
      return null;
    }
  }
});

export const dataMapDataLoaderSlice = createSlice({
  name: 'dataMapDataLoader',
  initialState,
  reducers: {
    changeTheme: (state, action: PayloadAction<string>) => {
      state.theme = action.payload;
    },
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeResourcePath: (state, action: PayloadAction<string>) => {
      state.resourcePath = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadDataMap.fulfilled, (state, action) => {
      state.dataMap = action.payload;
    });

    builder.addCase(loadDataMap.rejected, (state) => {
      // TODO change to null for error handling case
      state.dataMap = undefined;
    });
  },
});
