import type { Schema } from '@microsoft/logic-apps-data-mapper';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface SchemaLoadingState {
  armToken?: string;
  loadingMethod: 'file' | 'arm';
  inputSchema?: Schema;
  outputSchema?: Schema;
  availableSchemas?: Schema[];
}

const initialState: SchemaLoadingState = {
  loadingMethod: 'file',
};

export const schemaDataLoaderSlice = createSlice({
  name: 'schema',
  initialState,
  reducers: {
    changeArmToken: (state, action: PayloadAction<string>) => {
      state.armToken = action.payload;
    },
    changeLoadingMethod: (state, action: PayloadAction<'file' | 'arm'>) => {
      state.loadingMethod = action.payload;
    },
    changeInputSchema: (state, action: PayloadAction<Schema>) => {
      state.inputSchema = action.payload;

      if (!state.availableSchemas) {
        state.availableSchemas = [action.payload];
      } else if (!state.availableSchemas.some((availableSchema) => availableSchema.name === action.payload.name)) {
        state.availableSchemas = [...state.availableSchemas, action.payload];
      }
    },
    changeOutputSchema: (state, action: PayloadAction<Schema>) => {
      state.outputSchema = action.payload;

      if (!state.availableSchemas) {
        state.availableSchemas = [action.payload];
      } else if (!state.availableSchemas.some((availableSchema) => availableSchema.name === action.payload.name)) {
        state.availableSchemas = [...state.availableSchemas, action.payload];
      }
    },
  },
});
