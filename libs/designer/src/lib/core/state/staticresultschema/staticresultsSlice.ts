import { resetWorkflowState } from '../global';
import type { OpenApiSchema } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface StaticResultsState {
  schemas: Record<string, OpenApiSchema>; // { [connectorid-operationid]: Schema }
  properties: Record<string, any>; // { [nodeId+0](propertyName): any
}

interface StaticResultsSchemaUpdateEvent {
  id: string;
  schema: OpenApiSchema;
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
      const { id, schema } = action.payload;
      state.schemas[id] = schema;
    },
    updateStaticResultProperties: (state, action: PayloadAction<{ name: string; properties: any }>) => {
      const { name, properties } = action.payload;
      state.properties[name] = properties;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(resetWorkflowState, () => initialState);
  },
});

export const { initializeStaticResultProperties, deinitializeStaticResultProperty, addResultSchema, updateStaticResultProperties } =
  staticResultsSlice.actions;

export default staticResultsSlice.reducer;
