import { simpleMockSchema } from '../../__mocks__';
import { convertSchemaToSchemaExtended } from '../../utils/Schema.Utils';
import type { SchemaTreeProps } from './TargetTree';
import { TargetSchemaTree } from './TargetTree';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: TargetSchemaTree,
  title: 'Data Mapper/TargetSchemaTree',
} as ComponentMeta<typeof TargetSchemaTree>;

const mockSchema = convertSchemaToSchemaExtended(JSON.parse(JSON.stringify(simpleMockSchema)));

export const Standard: ComponentStory<typeof TargetSchemaTree> = (args: SchemaTreeProps) => <TargetSchemaTree {...args} />;
Standard.args = {
  schema: mockSchema,
  currentlySelectedNodes: [],
};
