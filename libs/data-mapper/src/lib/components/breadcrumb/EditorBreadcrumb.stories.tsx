import type { UpdateBreadcrumbAction } from '../../core/state/BreadcrumbSlice';
import breadcrumbReducer, { updateBreadcrumbForSchema } from '../../core/state/BreadcrumbSlice';
import type { Schema } from '../../models/Schema';
import { convertSchemaToSchemaExtended } from '../../models/Schema';
import { simpleMockSchema } from '../../models/__mocks__';
import { EditorBreadcrumb } from './EditorBreadcrumb';
import { configureStore } from '@reduxjs/toolkit';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { Provider } from 'react-redux';

const MockStore = ({ children }) => (
  <Provider
    store={configureStore({
      reducer: {
        breadcrumb: breadcrumbReducer,
      },
    })}
  >
    {children}
  </Provider>
);

export default {
  component: EditorBreadcrumb,
  title: 'Data Mapper/Breadcrumb',
} as ComponentMeta<typeof EditorBreadcrumb>;
export const Standard: ComponentStory<typeof EditorBreadcrumb> = () => {
  const schema: Schema = JSON.parse(JSON.stringify(simpleMockSchema));
  const extendedSchema = convertSchemaToSchemaExtended(schema);

  const stateUpdate: UpdateBreadcrumbAction = {
    schema: extendedSchema,
    currentNode: extendedSchema.schemaTreeRoot.children[0],
  };
  updateBreadcrumbForSchema(stateUpdate);

  return (
    <MockStore>
      <EditorBreadcrumb />
    </MockStore>
  );
};
