import { simpleMockSchema } from '../../__mocks__';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { SchemaTreeProps } from './SchemaTree';
import { SchemaTree } from './SchemaTree';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: SchemaTree,
  title: 'Data Mapper Components/ Tree',
} as ComponentMeta<typeof SchemaTree>;

const mockSchema = convertSchemaToSchemaExtended(JSON.parse(JSON.stringify(simpleMockSchema)));

export const SchemaTrees: ComponentStory<typeof SchemaTree> = (args: SchemaTreeProps) => <SchemaTree {...args} />;
SchemaTrees.args = {
  schema: mockSchema,
  currentlySelectedNodes: [],
};
