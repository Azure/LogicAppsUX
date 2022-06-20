import type { RootState } from './Store';
import type { Schema } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

export interface SchemaLoadingState {
  armToken?: string;
  inputResourcePath?: string;
  outputResourcePath?: string;
  availableResourcesPaths?: string[];
  loadingMethod: 'file' | 'arm';
  inputSchema?: Schema;
  outputSchema?: Schema;
  availableSchemas?: Schema[];
}

const initialState: SchemaLoadingState = {
  loadingMethod: 'file',
  inputResourcePath: '',
  outputResourcePath: '',
};

export const loadInputSchema = createAsyncThunk('schema/loadInputSchema', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const inputResourcePath = currentState.schemaDataLoader.inputResourcePath;

  // TODO ARM loading
  if (currentState.schemaDataLoader.loadingMethod === 'arm') {
    return undefined;
  } else {
    if (inputResourcePath) {
      return loadSchemaFromMock(inputResourcePath);
    }
  }

  return undefined;
});

export const loadOutputSchema = createAsyncThunk('schema/loadOutputSchema', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const outputResourcePath = currentState.schemaDataLoader.outputResourcePath;

  // TODO ARM loading
  if (currentState.schemaDataLoader.loadingMethod === 'arm') {
    return undefined;
  } else {
    if (outputResourcePath) {
      return loadSchemaFromMock(outputResourcePath);
    }
  }

  return undefined;
});

export const loadAvailableSchemas = createAsyncThunk('schema/loadAvailableSchemas', async (_: void, thunkAPI) => {
  const currentState: RootState = thunkAPI.getState() as RootState;
  const availableSchemaPaths = currentState.schemaDataLoader.availableResourcesPaths;

  // TODO ARM loading
  if (currentState.schemaDataLoader.loadingMethod === 'arm') {
    return undefined;
  } else {
    if (availableSchemaPaths) {
      const loadedSchemas = availableSchemaPaths.map(async (schemaPath) => loadSchemaFromMock(schemaPath));
      return (await Promise.all(loadedSchemas)).filter((x) => x) as Schema[];
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
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(loadInputSchema.fulfilled, (state, action) => {
      state.inputSchema = action.payload;
    });

    builder.addCase(loadInputSchema.rejected, (state) => {
      // TODO change to null for error handling case
      state.inputSchema = undefined;
    });

    builder.addCase(loadOutputSchema.fulfilled, (state, action) => {
      state.outputSchema = action.payload;
    });

    builder.addCase(loadOutputSchema.rejected, (state) => {
      // TODO change to null for error handling case
      state.outputSchema = undefined;
    });

    builder.addCase(loadAvailableSchemas.fulfilled, (state, action) => {
      state.availableSchemas = action.payload;
    });

    builder.addCase(loadAvailableSchemas.rejected, (state) => {
      // TODO change to null for error handling case
      state.availableSchemas = undefined;
    });
  },
});

const loadSchemaFromMock = async (resourcePath: string): Promise<Schema | undefined> => {
  try {
    const schema: Schema = await import(`../../../../__mocks__/schemas/${resourcePath}`);
    return schema;
  } catch {
    return undefined;
  }
};
