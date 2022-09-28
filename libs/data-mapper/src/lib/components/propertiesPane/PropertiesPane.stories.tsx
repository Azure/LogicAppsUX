import type { FunctionGroupBranding } from '../../constants/FunctionConstants';
import { SchemaNodeDataType } from '../../models';
import type { SelectedFunctionNode, SelectedSourceNode, SelectedTargetNode } from '../../models/SelectedNode';
import { NodeType } from '../../models/SelectedNode';
import type { PropertiesPaneProps } from './PropertiesPane';
import { PropertiesPane } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

const exSourceNode: SelectedSourceNode = {
  nodeType: NodeType.Source,
  name: 'ExSourceNode',
  path: '/path/to/ExSourceNode',
  dataType: SchemaNodeDataType.String,
};
const exTargetNode: SelectedTargetNode = {
  nodeType: NodeType.Target,
  name: 'ExTargetNode',
  path: '/path/to/ExTargetNode',
  dataType: SchemaNodeDataType.Int,
  defaultValue: 'Default value',
  doNotGenerateIfNoValue: true,
  nullable: true,
  inputIds: ['miscInputId'],
};
const exFunctionNode: SelectedFunctionNode = {
  id: 'functionId',
  nodeType: NodeType.Function,
  name: 'ExFunctionNode',
  branding: {} as FunctionGroupBranding,
  description: '',
  codeEx: '',
  inputs: [],
  outputId: '',
};

const nodeOptions = { noneSelected: undefined, exSourceNode, exTargetNode, exFunctionNode };

export default {
  component: PropertiesPane,
  title: 'Data Mapper Component/Pane/Properties Pane',
  argTypes: {
    currentNode: {
      defaultValue: nodeOptions[0],
      options: nodeOptions,
      mappings: nodeOptions,
      control: {
        type: 'select',
        labels: {
          noneSelected: 'No node selected',
          exSourceNode: 'Input node',
          exTargetNode: 'Output node',
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
