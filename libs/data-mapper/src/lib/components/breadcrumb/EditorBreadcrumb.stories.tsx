import { simpleMockSchema } from '../../__mocks__';
import { setCurrentOutputNode, setInitialOutputSchema } from '../../core/state/DataMapSlice';
import { store } from '../../core/state/Store';
import type { Schema, SchemaExtended, SchemaNodeExtended } from '../../models/Schema';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { EditorBreadcrumb } from './EditorBreadcrumb';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

interface MockStoreData {
  schema: SchemaExtended;
  currentNode: SchemaNodeExtended;
}

const MockStore = ({ mockState, children }) => {
  store.dispatch(setInitialOutputSchema(mockState.schema));
  store.dispatch(setCurrentOutputNode(mockState.currentNode));

  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: EditorBreadcrumb,
  title: 'Data Mapper/Breadcrumb',
} as ComponentMeta<typeof EditorBreadcrumb>;

const Template: ComponentStory<typeof EditorBreadcrumb> = () => {
  return <EditorBreadcrumb />;
};

export const Standard = Template.bind({});
Standard.decorators = [
  (story) => {
    const schema: Schema = JSON.parse(JSON.stringify(simpleMockSchema));
    const extendedSchema = convertSchemaToSchemaExtended(schema);

    const stateUpdate: MockStoreData = {
      schema: extendedSchema,
      currentNode: extendedSchema.schemaTreeRoot.children[0],
    };

    return <MockStore mockState={stateUpdate}>{story()}</MockStore>;
  },
];
