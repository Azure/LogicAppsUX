import { SchemaType } from '../../models';
import type { SelectSchemaCardProps } from './SelectSchemaCard';
import { SelectSchemaCard } from './SelectSchemaCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: SelectSchemaCard,
  title: 'Data Mapper Components/SelectSchemaCard',
} as ComponentMeta<typeof SelectSchemaCard>;

export const Standard: ComponentStory<typeof SelectSchemaCard> = (args: SelectSchemaCardProps) => <SelectSchemaCard {...args} />;
Standard.args = {
  schemaType: SchemaType.Source,
};
