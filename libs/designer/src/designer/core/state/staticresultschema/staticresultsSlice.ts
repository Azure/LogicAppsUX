import { resetWorkflowState } from '../global';
import type { OpenAPIV2 } from '@microsoft/logic-apps-designer';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

type Schema = OpenAPIV2.Schema;

export interface StaticResultsState {
  schemas: Record<string, Schema>; // { [connectorid-operationid]: Schema }
  properties: Record<string, any>; // { [nodeId+0](propertyName): any
}

interface StaticResultsSchemaUpdateEvent {
  id: string;
  schema: Schema;
}

export const initialState: StaticResultsState = {
  schemas: {},
  properties: {},
};

export const staticResultsSlice = createSlice({
  name: 'staticResults',
  initialState,
  reducers: {
    initializeStaticResultProperties: (state, action: PayloadAction<Record<string, any>>) => {
      state.properties = action.payload;
    },
    deinitializeStaticResultProperty: (state, action: PayloadAction<{ id: string }>) => {
      const { id } = action.payload;
      delete state.properties[id];
    },
    addResultSchema: (state, action: PayloadAction<StaticResultsSchemaUpdateEvent>) => {
      state.schemas[action.payload.id] = action.payload.schema;
    },
    updateStaticResultProperties: (state, action: PayloadAction<{ name: string; properties: any }>) => {
      state.properties[action.payload.name] = action.payload.properties;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { initializeStaticResultProperties, deinitializeStaticResultProperty, addResultSchema, updateStaticResultProperties } =
  staticResultsSlice.actions;

export default staticResultsSlice.reducer;
