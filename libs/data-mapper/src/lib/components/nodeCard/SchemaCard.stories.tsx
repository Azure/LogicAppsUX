import { SchemaNodeDataType, SchemaTypes } from '../../models';
import type { SchemaCardProps } from './SchemaCard';
import { SchemaCard } from './SchemaCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import type { NodeProps } from 'react-flow-renderer';
import { ReactFlowProvider } from 'react-flow-renderer';

export default {
  component: SchemaCard,
  title: 'Data Mapper Components/Node card',
} as ComponentMeta<typeof SchemaCard>;

export const Schema: ComponentStory<typeof SchemaCard> = (args: NodeProps<SchemaCardProps>) => (
  <div style={{ padding: '10px' }}>
    <ReactFlowProvider>
      <SchemaCard {...args} />
    </ReactFlowProvider>
  </div>
);
Schema.args = {
  data: {
    label: 'label',
    schemaType: SchemaTypes.Input,
    displayHandle: false,
    isLeaf: false,
    isChild: false,
    nodeDataType: SchemaNodeDataType.String,
    onClick: () => console.log('Schema card clicked'),
    disabled: false,
    error: false,
  },
};
