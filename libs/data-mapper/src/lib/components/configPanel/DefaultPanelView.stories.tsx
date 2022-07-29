import { setInputSchema, setOutputSchema } from '../../core/state/SchemaSlice';
import { store } from '../../core/state/Store';
import type { Schema, SchemaExtended } from '../../models/Schema';
import { convertSchemaToSchemaExtended } from '../../models/Schema';
import { simpleMockSchema } from '../../models/__mocks__';
import type { DefaultPanelViewProps } from './DefaultPanelView';
import { DefaultPanelView } from './DefaultPanelView';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

interface MockStoreData {
  inputSchema: SchemaExtended;
  outputSchema: SchemaExtended;
}

const MockStore = ({ mockState, children }) => {
  store.dispatch(setInputSchema(mockState.inputSchema));
  store.dispatch(setOutputSchema(mockState.outputSchema));

  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: DefaultPanelView,
  title: 'Data Mapper/DefaultPanelView',
} as ComponentMeta<typeof DefaultPanelView>;

const Template: ComponentStory<typeof DefaultPanelView> = (args: DefaultPanelViewProps) => {
  return <DefaultPanelView {...args} />;
};

export const Standard = Template.bind({});

Standard.args = {
  onInputSchemaClick: () => console.log('Input schema button clicked'),
  onOutputSchemaClick: () => console.log('Output schema button clicked'),
};

Standard.decorators = [
  (story) => {
    const schema: Schema = JSON.parse(JSON.stringify(simpleMockSchema));
    const extendedSchema = convertSchemaToSchemaExtended(schema);

    const stateUpdate: MockStoreData = {
      inputSchema: extendedSchema,
      outputSchema: extendedSchema,
    };

    return <MockStore mockState={stateUpdate}>{story()}</MockStore>;
  },
];
