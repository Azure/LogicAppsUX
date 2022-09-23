import { simpleMockSchema } from '../../__mocks__';
import { setInitialSourceSchema, setInitialTargetSchema } from '../../core/state/DataMapSlice';
import { store } from '../../core/state/Store';
import type { Schema, SchemaExtended } from '../../models/Schema';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { DefaultPanelViewProps } from './DefaultPanelView';
import { DefaultPanelView } from './DefaultPanelView';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

interface MockStoreData {
  sourceSchema: SchemaExtended;
  targetSchema: SchemaExtended;
}

const MockStore = ({ mockState, children }) => {
  store.dispatch(setInitialSourceSchema(mockState.sourceSchema));
  store.dispatch(setInitialTargetSchema(mockState.targetSchema));

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
  onSourceSchemaClick: () => console.log('Source schema button clicked'),
  onTargetSchemaClick: () => console.log('Target schema button clicked'),
};

Standard.decorators = [
  (story) => {
    const schema: Schema = JSON.parse(JSON.stringify(simpleMockSchema));
    const extendedSchema = convertSchemaToSchemaExtended(schema);

    const stateUpdate: MockStoreData = {
      sourceSchema: extendedSchema,
      targetSchema: extendedSchema,
    };

    return <MockStore mockState={stateUpdate}>{story()}</MockStore>;
  },
];
