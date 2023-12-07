import { LoadingMethod } from './DataMapDataLoader';
import type { RootState } from './Store';
import type { Schema } from '@microsoft/utils-logic-apps';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface SchemaLoadingState {
  armToken?: string;
  inputResourcePath?: string;
  outputResourcePath?: string;
  availableResourcesPaths?: string[];
  loadingMethod: LoadingMethod;
  sourceSchema?: Schema;
  targetSchema?: Schema;
  availableSchemas?: Schema[];
}

const initialState: SchemaLoadingState = {
  loadingMethod: LoadingMethod.File,
  inputResourcePath: '',
  outputResourcePath: '',
};

export const loadSourceSchema = createAsyncThunk('schema/loadSourceSchema', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const inputResourcePath = currentState.schemaDataLoader.inputResourcePath;

  // TODO ARM loading
  if (currentState.schemaDataLoader.loadingMethod === LoadingMethod.Arm) {
    return undefined;
  } else {
    if (inputResourcePath) {
      return loadSchemaFromMock(inputResourcePath);
    }
  }

  return undefined;
});

export const loadTargetSchema = createAsyncThunk('schema/loadTargetSchema', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const outputResourcePath = currentState.schemaDataLoader.outputResourcePath;

  // TODO ARM loading
  if (currentState.schemaDataLoader.loadingMethod === LoadingMethod.Arm) {
    return undefined;
  } else {
    if (outputResourcePath) {
      return loadSchemaFromMock(outputResourcePath);
    }
  }

  return undefined;
});

export const schemaDataLoaderSlice = createSlice({
  name: 'schema',
  initialState,
  reducers: {
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeInputResourcePath: (state, action: PayloadAction<string>) => {
      state.inputResourcePath = action.payload;
    },
    changeOutputResourcePath: (state, action: PayloadAction<string>) => {
      state.outputResourcePath = action.payload;
    },
    changeAvailableResourcesPath: (state, action: PayloadAction<string[]>) => {
      state.availableResourcesPaths = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<LoadingMethod>) => {
      state.loadingMethod = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadSourceSchema.fulfilled, (state, action) => {
      state.sourceSchema = action.payload;
    });

    builder.addCase(loadSourceSchema.rejected, (state) => {
      // TODO change to null for error handling case
      state.sourceSchema = undefined;
    });

    builder.addCase(loadTargetSchema.fulfilled, (state, action) => {
      state.targetSchema = action.payload;
    });

    builder.addCase(loadTargetSchema.rejected, (state) => {
      // TODO change to null for error handling case
      state.targetSchema = undefined;
    });
  },
});

const loadSchemaFromMock = async (resourcePath: string): Promise<Schema | undefined> => {
  try {
    const schema: Schema = await import(`../../../../__mocks__/schemas/${resourcePath}`);
    return schema;
  } catch (ex) {
    console.error(ex);
    return undefined;
  }
};
