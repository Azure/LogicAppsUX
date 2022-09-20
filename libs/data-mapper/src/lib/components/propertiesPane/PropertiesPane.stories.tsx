import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { SchemaNodeDataType } from '../../models';
import type { SelectedFunctionNode, SelectedInputNode, SelectedOutputNode } from '../../models/SelectedNode';
import { NodeType } from '../../models/SelectedNode';
import type { PropertiesPaneProps } from './PropertiesPane';
import { PropertiesPane } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

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
  nullable: true,
  inputIds: ['miscInputId'],
};
const exFunctionNode: SelectedFunctionNode = {
  nodeType: NodeType.Function,
  name: 'ExFunctionNode',
  branding: {} as FunctionGroupBranding,
  description: '',
  codeEx: '',
  definition: '',
  inputs: [],
  outputId: '',
};

const nodeOptions = { noneSelected: undefined, exInputNode, exOutputNode, exFunctionNode };

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
          exFunctionNode: 'Function node',
        },
      },
    },
  },
} as ComponentMeta<typeof PropertiesPane>;

export const Standard: ComponentStory<typeof PropertiesPane> = (args: PropertiesPaneProps) => (
  <PropertiesPane
    {...args}
    setIsExpanded={() => {
      return;
    }}
    setContentHeight={() => {
      return;
    }}
  />
);
Standard.args = {
  currentNode: undefined,
};
