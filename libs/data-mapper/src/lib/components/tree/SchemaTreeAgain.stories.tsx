import { simpleMockSchema } from '../../__mocks__';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { SchemaTreeProps } from './SchemaTree';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { SchemaTreeDanielle } from './SchemaTreeAgain';

export default {
  component: SchemaTreeDanielle,
  title: 'Data Mapper/SchemaTreeDanielle',
} as ComponentMeta<typeof SchemaTreeDanielle>;

const mockSchema = convertSchemaToSchemaExtended(JSON.parse(JSON.stringify(simpleMockSchema)));

export const Standard: ComponentStory<typeof SchemaTreeDanielle> = (args: SchemaTreeProps) => <SchemaTreeDanielle {...args} />;
Standard.args = {
  schema: mockSchema,
  currentlySelectedNodes: [],
};
