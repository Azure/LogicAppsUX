import { NodeType } from '../../models/SelectedNode';
import type { SelectedNode } from '../../models/SelectedNode';
import type { PropertiesPaneProps } from './PropertiesPane';
import { PropertiesPane } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

const exSourceSchemaNode: SelectedNode = {
  type: NodeType.Source,
  id: 'srcSchemaNodeId',
};
const exTargetSchemaNode: SelectedNode = {
  type: NodeType.Target,
  id: 'tgtSchemaNodeId',
};
const exFunctionNode: SelectedNode = {
  type: NodeType.Function,
  id: 'functionId',
};

const nodeOptions = { noneSelected: undefined, exSourceSchemaNode, exTargetSchemaNode, exFunctionNode };

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
          exSourceNode: 'Source schema node',
          exTargetNode: 'Target schema node',
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
