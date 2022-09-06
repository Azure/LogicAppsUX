import { SchemaTypes } from '../../models';
import type { SelectSchemaCardProps } from './selectSchemaCard';
import { SelectSchemaCard } from './selectSchemaCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: SelectSchemaCard,
  title: 'Data Mapper Components/Misc/Select Schema card',
} as ComponentMeta<typeof SelectSchemaCard>;

export const Standard: ComponentStory<typeof SelectSchemaCard> = (args: SelectSchemaCardProps) => <SelectSchemaCard {...args} />;
Standard.args = {
  schemaType: SchemaTypes.Input,
  onClick: () => console.log('Select Schema Card clicked'),
};
