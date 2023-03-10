import type { Schema } from '@microsoft/parsers-logic-apps';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface StaticResultSchemaState {
  schemas: Record<string, Schema>; // { [connectorid-operationid]: Schema }
}

interface StaticResultSchemaUpdateEvent {
  id: string;
  schema: Schema;
}

export const initialState: StaticResultSchemaState = {
  schemas: {},
};

export const staticResultSchemasSlice = createSlice({
  name: 'staticResultSchema',
  initialState,
  reducers: {
    addSchema: (state, action: PayloadAction<StaticResultSchemaUpdateEvent>) => {
      state.schemas[action.payload.id] = action.payload.schema;
    },
  },
});

export const { addSchema } = staticResultSchemasSlice.actions;

export default staticResultSchemasSlice.reducer;
