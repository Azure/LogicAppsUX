import type { Schema, SchemaExtended, SchemaNode, SchemaNodeExtended } from '../../models/Schema';
import { convertSchemaToSchemaExtended } from '../../models/Schema';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface UpdateBreadcrumbAction {
  schema?: Schema;
  currentNode?: SchemaNode;
}

export interface SchemaState {
  inputSchema?: SchemaExtended;
  outputSchema?: SchemaExtended;
  currentInputNode?: SchemaNodeExtended;
  currentOutputNode?: SchemaNodeExtended;
}

export const initialSchemaState: SchemaState = {};

export const schemaSlice = createSlice({
  name: 'schema',
  initialState: initialSchemaState,
  reducers: {
    setInputSchema: (state, action: PayloadAction<Schema | undefined>) => {
      const incomingSchema = action.payload;
      if (incomingSchema) {
        const extendedSchema = convertSchemaToSchemaExtended(incomingSchema);
        state.inputSchema = extendedSchema;
        state.currentInputNode = extendedSchema.schemaTreeRoot;
      }
    },
    setOutputSchema: (state, action: PayloadAction<Schema | undefined>) => {
      const incomingSchema = action.payload;
      if (incomingSchema) {
        const extendedSchema = convertSchemaToSchemaExtended(incomingSchema);
        state.outputSchema = extendedSchema;
        state.currentOutputNode = extendedSchema.schemaTreeRoot;
      }
    },
    setCurrentInputNode: (state, action: PayloadAction<SchemaNodeExtended | undefined>) => {
      state.currentInputNode = action.payload;
    },
    setCurrentOutputNode: (state, action: PayloadAction<SchemaNodeExtended | undefined>) => {
      state.currentOutputNode = action.payload;
    },
  },
});

export const { setInputSchema, setOutputSchema, setCurrentInputNode, setCurrentOutputNode } = schemaSlice.actions;

export default schemaSlice.reducer;
