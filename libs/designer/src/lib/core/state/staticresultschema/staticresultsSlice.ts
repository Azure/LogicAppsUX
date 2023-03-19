import type { Schema } from '@microsoft/parsers-logic-apps';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface StaticResultsState {
  schemas: Record<string, Schema>; // { [connectorid-operationid]: Schema }
}

interface StaticResultsSchemaUpdateEvent {
  id: string;
  schema: Schema;
}

export const initialState: StaticResultsState = {
  schemas: {},
};

export const staticResultsSlice = createSlice({
  name: 'staticResults',
  initialState,
  reducers: {
    addResultSchema: (state, action: PayloadAction<StaticResultsSchemaUpdateEvent>) => {
      state.schemas[action.payload.id] = action.payload.schema;
    },
  },
});

export const { addResultSchema } = staticResultsSlice.actions;

export default staticResultsSlice.reducer;
