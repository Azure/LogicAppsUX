import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface SchemaState {
  availableSchemas: string[];
}

export const initialSchemaState: SchemaState = {
  availableSchemas: [],
};

export const schemaSlice = createSlice({
  name: 'schema',
  initialState: initialSchemaState,
  reducers: {
    setAvailableSchemas: (state, action: PayloadAction<string[] | undefined>) => {
      if (action.payload) {
        state.availableSchemas = action.payload;
      } else {
        state.availableSchemas = [];
      }
    },
  },
});

export const { setAvailableSchemas } = schemaSlice.actions;

export default schemaSlice.reducer;
