import { SchemaTypes } from '../../models';
import type { SchemaCardWrapperProps } from './SchemaCard';
import { SchemaCardWrapper } from './SchemaCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { ReactFlowProvider } from 'react-flow-renderer';

export default {
  component: SchemaCardWrapper,
  title: 'Data Mapper/SchemaCard',
} as ComponentMeta<typeof SchemaCardWrapper>;

export const Standard: ComponentStory<typeof SchemaCardWrapper> = (args: SchemaCardWrapperProps) => (
  <div style={{ padding: '10px' }}>
    <ReactFlowProvider>
      <SchemaCardWrapper {...args} />
    </ReactFlowProvider>
  </div>
);
Standard.args = {
  label: 'label',
  schemaType: SchemaTypes.Input,
  displayHandle: false,
  isLeaf: false,
  onClick: () => console.log('Schema card clicked'),
  disabled: false,
};
