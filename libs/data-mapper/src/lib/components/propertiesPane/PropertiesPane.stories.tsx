import { NodeType } from '../../models';
import { PropertiesPane } from './PropertiesPane';
import type { PropertiesPaneProps } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

const exInputNode = { type: NodeType.Input };
const exOutputNode = { type: NodeType.Output };
const exExpressionNode = { type: NodeType.Expression };

export default {
  component: PropertiesPane,
  title: 'Data Mapper/PropertiesPane',
  argTypes: {
    currentNode: {
      options: [undefined, exInputNode, exOutputNode, exExpressionNode],
      control: { type: 'select' },
    },
  },
} as ComponentMeta<typeof PropertiesPane>;

export const Standard: ComponentStory<typeof PropertiesPane> = (args: PropertiesPaneProps) => <PropertiesPane {...args} />;
Standard.args = {
  currentNode: undefined,
};
