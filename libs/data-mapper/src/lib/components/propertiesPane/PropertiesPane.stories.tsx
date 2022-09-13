import React from 'react';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import { SchemaNodeDataType } from '../../models';
import { NodeType } from '../../models/SelectedNode';
import type { SelectedExpressionNode, SelectedInputNode, SelectedOutputNode } from '../../models/SelectedNode';
import { PropertiesPane } from './PropertiesPane';
import type { PropertiesPaneProps } from './PropertiesPane';

const exInputNode: SelectedInputNode = {
  nodeType: NodeType.Input,
  name: 'ExInputNode',
  path: '/path/to/ExInputNode',
  dataType: SchemaNodeDataType.String,
};
const exOutputNode: SelectedOutputNode = {
  nodeType: NodeType.Output,
  name: 'ExOutputNode',
  path: '/path/to/ExOutputNode',
  dataType: SchemaNodeDataType.Int,
  defaultValue: 'Default value',
  doNotGenerateIfNoValue: true,
  nullable: true
};
const exExpressionNode: SelectedExpressionNode = {
  nodeType: NodeType.Expression,
  name: 'ExExpressionNode',
  iconName: '',
  description: '',
  codeEx: '',
  definition: '',
  inputs: [],
  outputId: ''
};

const nodeOptions = { noneSelected: undefined, exInputNode, exOutputNode, exExpressionNode };

export default {
  component: PropertiesPane,
  title: 'Data Mapper/PropertiesPane',
  argTypes: {
    currentNode: {
      defaultValue: nodeOptions[0],
      options: nodeOptions,
      mappings: nodeOptions,
      control: {
        type: 'select',
        labels: {
          noneSelected: 'No node selected',
          exInputNode: 'Input node',
          exOutputNode: 'Output node',
          exExpressionNode: 'Expression node',
        },
      },
    },
  },
} as ComponentMeta<typeof PropertiesPane>;

export const Standard: ComponentStory<typeof PropertiesPane> = (args: PropertiesPaneProps) => <PropertiesPane {...args} />;
Standard.args = {
  currentNode: undefined,
};
