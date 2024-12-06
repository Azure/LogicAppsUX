import type { PayloadAction, Reducer } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface SchemaState {
  availableSchemas: string[];
}

export const initialSchemaState: SchemaState = {
  availableSchemas: [],
};

type Reducers = {
  setAvailableSchemas: (state: SchemaState, action: PayloadAction<string[] | undefined>) => void;
};

export const schemaSlice = createSlice<SchemaState, Reducers, 'schema', any>({
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

const schemaReducer: Reducer<SchemaState> = schemaSlice.reducer;
export default schemaReducer;
