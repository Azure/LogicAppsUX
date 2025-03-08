import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import type { IFileSysTreeItem } from '@microsoft/logic-apps-shared';

export interface SchemaState {
  availableSchemas: IFileSysTreeItem[];
}

export const initialSchemaState: SchemaState = {
  availableSchemas: [],
};

export const schemaSlice = createSlice({
  name: 'schema',
  initialState: initialSchemaState,
  reducers: {
    setAvailableSchemas: (state, action: PayloadAction<IFileSysTreeItem[]>) => {
      if (action.payload) {
        state.availableSchemas = action.payload;
      } else {
        state.availableSchemas = [];
      }
    },
  },
});

export const { setAvailableSchemas } = schemaSlice.actions;

export default schemaSlice.reducer;
