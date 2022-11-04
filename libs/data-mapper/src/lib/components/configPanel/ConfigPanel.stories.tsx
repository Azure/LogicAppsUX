import type { InitialSchemaAction } from '../../core/state/DataMapSlice';
import { setInitialSchema } from '../../core/state/DataMapSlice';
import { setAvailableSchemas } from '../../core/state/SchemaSlice';
import { store } from '../../core/state/Store';
import type { Schema, SchemaExtended } from '../../models/Schema';
import { SchemaType } from '../../models/Schema';
import { noChildrenMockSchema, simpleMockSchema } from '../../models/__mocks__';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import { ConfigPanel } from './ConfigPanel';
import type { ConfigPanelProps } from './ConfigPanel';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

interface MockStoreData {
  availableSchemas: Schema[];
  sourceSchema: SchemaExtended;
  targetSchema: SchemaExtended;
}

const MockStore = ({ mockState, children }) => {
  const extendedSourceSchema = convertSchemaToSchemaExtended(mockState.sourceSchema);
  const sourceAction: InitialSchemaAction = {
    schema: extendedSourceSchema,
    schemaType: SchemaType.Source,
  };

  const extendedTargetSchema = convertSchemaToSchemaExtended(mockState.targetSchema);
  const targetAction: InitialSchemaAction = {
    schema: extendedTargetSchema,
    schemaType: SchemaType.Target,
  };

  store.dispatch(setAvailableSchemas(mockState.availableSchemas));
  store.dispatch(setInitialSchema(sourceAction));
  store.dispatch(setInitialSchema(targetAction));

  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: ConfigPanel,
  title: 'Data Mapper Components/Panel/Configuration Panel',
} as ComponentMeta<typeof ConfigPanel>;

const Template: ComponentStory<typeof ConfigPanel> = (args: ConfigPanelProps) => {
  return <ConfigPanel {...args} />;
};

export const Standard = Template.bind({});

Standard.args = {
  onSourceSchemaClick: () => console.log('Source schema button clicked'),
  onTargetSchemaClick: () => console.log('Target schema button clicked'),
  schemaType: SchemaType.Source,
  setSelectedSchema: () => console.log('Selected new schema'),
  errorMessage: '',
};

Standard.decorators = [
  (story) => {
    const schema: Schema = JSON.parse(JSON.stringify(simpleMockSchema));
    const extendedSchema = convertSchemaToSchemaExtended(schema);

    const stateUpdate: MockStoreData = {
      availableSchemas: [JSON.parse(JSON.stringify(simpleMockSchema)), JSON.parse(JSON.stringify(noChildrenMockSchema))],
      sourceSchema: extendedSchema,
      targetSchema: extendedSchema,
    };

    return <MockStore mockState={stateUpdate}>{story()}</MockStore>;
  },
];
