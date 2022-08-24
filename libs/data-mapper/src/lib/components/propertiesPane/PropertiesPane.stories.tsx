import { NodeType } from '../../models';
import { PropertiesPane } from './PropertiesPane';
import type { PropertiesPaneProps } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

const exInputNode = { type: NodeType.Input };
const exOutputNode = { type: NodeType.Output };
const exExpressionNode = { type: NodeType.Expression };

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
