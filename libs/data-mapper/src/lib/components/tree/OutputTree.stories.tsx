import { simpleMockSchema } from '../../__mocks__';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { SchemaTreeProps } from './OutputTree';
import { OutputSchemaTree } from './OutputTree';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: OutputSchemaTree,
  title: 'Data Mapper/OutputSchemaTree',
} as ComponentMeta<typeof OutputSchemaTree>;

const mockSchema = convertSchemaToSchemaExtended(JSON.parse(JSON.stringify(simpleMockSchema)));

export const Standard: ComponentStory<typeof OutputSchemaTree> = (args: SchemaTreeProps) => <OutputSchemaTree {...args} />;
Standard.args = {
  schema: mockSchema,
  currentlySelectedNodes: [],
};
