import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { IFileSysTreeItem } from '../../models/Tree';

export interface SchemaState {
  availableSchemas: IFileSysTreeItem | undefined;
}

export const initialSchemaState: SchemaState = {
  availableSchemas: undefined,
};

export const schemaSlice = createSlice({
  name: 'schema',
  initialState: initialSchemaState,
  reducers: {
    setAvailableSchemas: (state, action: PayloadAction<IFileSysTreeItem | undefined>) => {
      if (action.payload) {
        state.availableSchemas = action.payload;
      } else {
        state.availableSchemas = undefined;
      }
    },
  },
});

export const { setAvailableSchemas } = schemaSlice.actions;

export default schemaSlice.reducer;
