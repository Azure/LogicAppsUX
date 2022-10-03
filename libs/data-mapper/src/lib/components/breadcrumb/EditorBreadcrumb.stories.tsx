import { setCurrentTargetNode, setInitialSchema } from '../../core/state/DataMapSlice';
import { store } from '../../core/state/Store';
import type { Schema, SchemaExtended, SchemaNodeExtended } from '../../models/Schema';
import { SchemaTypes } from '../../models/Schema';
import { simpleMockSchema } from '../../models/__mocks__';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { EditorBreadcrumb } from './EditorBreadcrumb';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React, { useState } from 'react';
import { Provider } from 'react-redux';

interface MockStoreData {
  schema: SchemaExtended;
  currentNode: SchemaNodeExtended;
}

const MockStore = ({ mockState, children }) => {
  store.dispatch(setInitialSchema({ schema: mockState.schema, schemaType: SchemaTypes.Target, flattenedSchema: {} }));
  store.dispatch(setCurrentTargetNode({ schemaNode: mockState.currentNode, resetSelectedSourceNodes: true }));

  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: EditorBreadcrumb,
  title: 'Data Mapper Components/Breadcrumb',
} as ComponentMeta<typeof EditorBreadcrumb>;

const Template: ComponentStory<typeof EditorBreadcrumb> = () => {
  const [isCodeViewOpen, setIsCodeViewOpen] = useState<boolean>(false);
  return <EditorBreadcrumb isCodeViewOpen={isCodeViewOpen} setIsCodeViewOpen={setIsCodeViewOpen} />;
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
