import type { SelectedNode } from '../../models';
import { NodeType } from '../../models';
import { PropertiesPane } from './PropertiesPane';
import type { PropertiesPaneProps } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

const exInputNode: SelectedNode = { type: NodeType.Input, name: 'ExInputNode', path: '/path/to/ExInputNode' };
const exOutputNode: SelectedNode = { type: NodeType.Output, name: 'ExOutputNode', path: '/path/to/ExOutputNode' };
const exExpressionNode: SelectedNode = { type: NodeType.Expression, name: 'ExExpressionNode', path: '/path/to/ExExpressionNode' };

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
