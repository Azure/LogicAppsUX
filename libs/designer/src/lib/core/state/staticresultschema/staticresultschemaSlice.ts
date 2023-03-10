import type { Schema } from '@microsoft/parsers-logic-apps';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface StaticResultSchemaState {
  staticResultSchema?: Record<string, Schema>; // { [connectorid-operationid]: Schema }
}

export const initialState: StaticResultSchemaState = {
  staticResultSchema: {},
};

export const staticResultSchemasSlice = createSlice({
  name: 'staticResultSchema',
  initialState,
  reducers: {
    initializeSchema: (state, action: PayloadAction<Record<string, StaticResultSchemaState>>) => {
      state.staticResultSchema = action.payload;
    },
  },
});

export const { initializeSchema } = staticResultSchemasSlice.actions;

export default staticResultSchemasSlice.reducer;
