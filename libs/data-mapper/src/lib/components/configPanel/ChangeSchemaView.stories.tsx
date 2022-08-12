import { setAvailableSchemas } from '../../core/state/SchemaSlice';
import { store } from '../../core/state/Store';
import type { Schema } from '../../models/Schema';
import { SchemaTypes } from '../../models/Schema';
import { noChildrenMockSchema, simpleMockSchema } from '../../models/__mocks__';
import type { ChangeSchemaViewProps } from './ChangeSchemaView';
import { ChangeSchemaView } from './ChangeSchemaView';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

interface MockStoreData {
  availableSchemas: Schema[];
}

const MockStore = ({ mockState, children }) => {
  store.dispatch(setAvailableSchemas(mockState.availableSchemas));

  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: ChangeSchemaView,
  title: 'Data Mapper/ChangeSchemaView',
} as ComponentMeta<typeof ChangeSchemaView>;

const Template: ComponentStory<typeof ChangeSchemaView> = (args: ChangeSchemaViewProps) => {
  return <ChangeSchemaView {...args} />;
};

export const Standard = Template.bind({});

Standard.args = {
  schemaType: SchemaTypes.Input,
  setSelectedSchema: () => console.log('Selected new schema'),
  errorMessage: '',
};

Standard.decorators = [
  (story) => {
    const availableSchemas = [JSON.parse(JSON.stringify(simpleMockSchema)), JSON.parse(JSON.stringify(noChildrenMockSchema))];

    const stateUpdate: MockStoreData = {
      availableSchemas: availableSchemas,
    };

    return <MockStore mockState={stateUpdate}>{story()}</MockStore>;
  },
];
