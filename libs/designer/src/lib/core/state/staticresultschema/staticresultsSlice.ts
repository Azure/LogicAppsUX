import { resetWorkflowState, setStateAfterUndoRedo } from '../global';
import type { OpenApiSchema } from '@microsoft/logic-apps-shared';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { UndoRedoPartialRootState } from '../undoRedo/undoRedoTypes';

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
    initScopeCopiedStaticResultProperties: (state, action: PayloadAction<Record<string, any>>) => {
      const copiedConnections = action.payload;
      Object.entries(copiedConnections).forEach(([nodeId, staticResultProperty]) => {
        state.properties[nodeId + 0] = staticResultProperty;
      });
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
    builder.addCase(setStateAfterUndoRedo, (_, action: PayloadAction<UndoRedoPartialRootState>) => action.payload.staticResults);
  },
});

export const {
  initializeStaticResultProperties,
  initScopeCopiedStaticResultProperties,
  deinitializeStaticResultProperty,
  addResultSchema,
  updateStaticResultProperties,
} = staticResultsSlice.actions;

export default staticResultsSlice.reducer;
