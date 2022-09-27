import { simpleMockSchema } from '../../__mocks__';
import type { InitialSchemaAction } from '../../core/state/DataMapSlice';
import { setInitialSchema } from '../../core/state/DataMapSlice';
import { store } from '../../core/state/Store';
import type { Schema, SchemaExtended } from '../../models/Schema';
import { SchemaTypes } from '../../models/Schema';
import { convertSchemaToSchemaExtended, flattenSchema } from '../../utils/Schema.Utils';
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
  const extendedSourceSchema = convertSchemaToSchemaExtended(mockState.sourceSchema);
  const sourceAction: InitialSchemaAction = {
    schema: extendedSourceSchema,
    schemaType: SchemaTypes.Source,
    flattenedSchema: flattenSchema(extendedSourceSchema, SchemaTypes.Source),
  };

  const extendedTargetSchema = convertSchemaToSchemaExtended(mockState.targetSchema);
  const targetAction: InitialSchemaAction = {
    schema: extendedTargetSchema,
    schemaType: SchemaTypes.Target,
    flattenedSchema: flattenSchema(extendedTargetSchema, SchemaTypes.Target),
  };

  store.dispatch(setInitialSchema(sourceAction));
  store.dispatch(setInitialSchema(targetAction));

  return <Provider store={store}>{children}</Provider>;
};

export default {
  component: DefaultPanelView,
  title: 'Data Mapper Components/Panel/DefaultPanelView',
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
