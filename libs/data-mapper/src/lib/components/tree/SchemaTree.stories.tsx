import { simpleMockSchema } from '../../models/__mocks__';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { SchemaTreeProps } from './SchemaTree';
import { SchemaTree } from './SchemaTree';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: SchemaTree,
  title: 'Data Mapper Components/Tree/Schema Tree',
} as ComponentMeta<typeof SchemaTree>;

const mockSchema = convertSchemaToSchemaExtended(JSON.parse(JSON.stringify(simpleMockSchema)));

export const Standard: ComponentStory<typeof SchemaTree> = (args: SchemaTreeProps) => <SchemaTree {...args} />;
Standard.args = {
  schema: mockSchema,
  toggledNodes: [],
  onNodeClick: (_schemaNode) => console.log('Clicked'),
};
