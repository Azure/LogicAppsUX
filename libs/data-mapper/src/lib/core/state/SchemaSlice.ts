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
  availableSchemas: Schema[];
  currentInputNodes: SchemaNodeExtended[];
  currentOutputNode?: SchemaNodeExtended;
}

export const initialSchemaState: SchemaState = {
  availableSchemas: [],
  currentInputNodes: [],
};

export const schemaSlice = createSlice({
  name: 'schema',
  initialState: initialSchemaState,
  reducers: {
    setInputSchema: (state, action: PayloadAction<Schema | undefined>) => {
      const incomingSchema = action.payload;
      if (incomingSchema) {
        const extendedSchema = convertSchemaToSchemaExtended(incomingSchema);
        state.inputSchema = extendedSchema;
        state.currentInputNodes = [];
      }
    },
    setInputSchemaExtended: (state, action: PayloadAction<SchemaExtended | undefined>) => {
      state.inputSchema = action.payload;
      state.currentInputNodes = [];
    },
    setOutputSchema: (state, action: PayloadAction<Schema | undefined>) => {
      const incomingSchema = action.payload;
      if (incomingSchema) {
        const extendedSchema = convertSchemaToSchemaExtended(incomingSchema);
        state.outputSchema = extendedSchema;
        state.currentOutputNode = extendedSchema.schemaTreeRoot;
      }
    },
    setOutputSchemaExtended: (state, action: PayloadAction<SchemaExtended | undefined>) => {
      state.outputSchema = action.payload;
      state.currentOutputNode = action.payload?.schemaTreeRoot;
    },
    setAvailableSchemas: (state, action: PayloadAction<Schema[] | undefined>) => {
      if (action.payload) {
        state.availableSchemas = action.payload;
      } else {
        state.availableSchemas = [];
      }
    },
    setCurrentInputNodes: (state, action: PayloadAction<SchemaNodeExtended[] | undefined>) => {
      if (action.payload) {
        const uniqueNodes = state.currentInputNodes.concat(action.payload).filter((node, index, self) => {
          return self.findIndex((subNode) => subNode.key === node.key) === index;
        });
        state.currentInputNodes = uniqueNodes;
      } else {
        state.currentInputNodes = [];
      }
    },
    addCurrentInputNodes: (state, action: PayloadAction<SchemaNodeExtended[]>) => {
      const uniqueNodes = state.currentInputNodes.concat(action.payload).filter((node, index, self) => {
        return self.findIndex((subNode) => subNode.key === node.key) === index;
      });
      state.currentInputNodes = uniqueNodes;
    },
    toggleInputNode: (state, action: PayloadAction<SchemaNodeExtended>) => {
      const existingNode = state.currentInputNodes.find((currentNode) => currentNode.key === action.payload.key);
      if (existingNode) {
        state.currentInputNodes = state.currentInputNodes.filter((currentNode) => currentNode.key !== action.payload.key);
      } else {
        state.currentInputNodes.push(action.payload);
      }
    },
    setCurrentOutputNode: (state, action: PayloadAction<SchemaNodeExtended | undefined>) => {
      state.currentOutputNode = action.payload;
    },
  },
});

export const {
  setInputSchema,
  setInputSchemaExtended,
  setOutputSchema,
  setOutputSchemaExtended,
  setAvailableSchemas,
  setCurrentInputNodes,
  addCurrentInputNodes,
  toggleInputNode,
  setCurrentOutputNode,
} = schemaSlice.actions;

export default schemaSlice.reducer;
