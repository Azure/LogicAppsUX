import { store } from '../../core/state/Store';
import { SchemaType } from '../../models';
import type { SelectSchemaCardProps } from './SelectSchemaCard';
import { SelectSchemaCard } from './SelectSchemaCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: SelectSchemaCard,
  title: 'Data Mapper Components/SelectSchemaCard',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof SelectSchemaCard>;

export const Standard: ComponentStory<typeof SelectSchemaCard> = (args: SelectSchemaCardProps) => <SelectSchemaCard {...args} />;

Standard.args = {
  schemaType: SchemaType.Source,
};
