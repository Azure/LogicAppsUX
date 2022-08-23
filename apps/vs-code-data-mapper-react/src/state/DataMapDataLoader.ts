import type { RootState } from './Store';
import type { DataMap } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface DataMapLoadingState {
  armToken?: string;
  loadingMethod: 'file' | 'arm';
  dataMap?: DataMap;
}

const initialState: DataMapLoadingState = {
  loadingMethod: 'file',
};

// TODO: Data Map handling (file and ARM)
export const loadDataMap = createAsyncThunk('loadDataMap', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;

  if (currentState.dataMapDataLoader.loadingMethod === 'arm') {
    return undefined;
  } else {
    return undefined;
  }
});

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
  },
  extraReducers: (builder) => {
    builder.addCase(loadDataMap.fulfilled, (state, action) => {
      state.dataMap = action.payload;
    });

    builder.addCase(loadDataMap.rejected, (state) => {
      state.dataMap = undefined;
    });
  },
});
