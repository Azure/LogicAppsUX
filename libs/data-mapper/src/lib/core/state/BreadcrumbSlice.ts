import type { SchemaExtended, SchemaNodeExtended } from '../../models/Schema';
import type { IBreadcrumbItem } from '@fluentui/react';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

export interface UpdateBreadcrumbAction {
  schema?: SchemaExtended;
  currentNode?: SchemaNodeExtended;
}

export interface BreadcrumbState {
  breadcrumbItems: IBreadcrumbItem[];
}

export const initialBreadcrumbState: BreadcrumbState = {
  breadcrumbItems: [],
};

export const breadcrumbSlice = createSlice({
  name: 'breadCrumb',
  initialState: initialBreadcrumbState,
  reducers: {
    updateBreadcrumbForSchema: (state, action: PayloadAction<UpdateBreadcrumbAction>) => {
      const { schema, currentNode } = action.payload;
      if (!schema) {
        state.breadcrumbItems = [];
      } else {
        const newBreadcrumbItems = convertToBreadcrumbItems(schema, currentNode);
        state.breadcrumbItems = newBreadcrumbItems;
      }
    },
  },
});

const convertToBreadcrumbItems = (schema: SchemaExtended, currentNode?: SchemaNodeExtended) => {
  const rootItem = {
    key: schema.name,
    text: schema.name,
  };

  const breadcrumbItems = [rootItem];

  if (currentNode?.pathToRoot) {
    currentNode.pathToRoot.forEach((pathItem) => {
      breadcrumbItems.push({
        key: pathItem.name,
        text: pathItem.name,
      });
    });
  }

  return breadcrumbItems;
};

export const { updateBreadcrumbForSchema } = breadcrumbSlice.actions;

export default breadcrumbSlice.reducer;
