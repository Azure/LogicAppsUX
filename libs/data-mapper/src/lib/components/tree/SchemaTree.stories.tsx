import { convertSchemaToSchemaExtended } from '../../models/Schema';
import { simpleMockSchema } from '../../models/__mocks__';
import type { SchemaTreeProps } from './SchemaTree';
import { SchemaTree } from './SchemaTree';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: SchemaTree,
  title: 'Data Mapper/SchemaTree',
} as ComponentMeta<typeof SchemaTree>;

const mockSchema = convertSchemaToSchemaExtended(JSON.parse(JSON.stringify(simpleMockSchema)));

export const Standard: ComponentStory<typeof SchemaTree> = (args: SchemaTreeProps) => <SchemaTree {...args} />;
Standard.args = {
  schema: mockSchema,
};
