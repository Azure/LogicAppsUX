import type { FloatingPanelProps } from '../floatingPanel/FloatingPanel';
import { FloatingPanel } from '../floatingPanel/FloatingPanel';
import type { FunctionListProps } from './FunctionList';
import { FunctionList } from './FunctionList';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: FunctionList,
  title: 'Data Mapper/FunctionList',
} as ComponentMeta<typeof FunctionList>;

const toolboxPanelProps: FloatingPanelProps = {
  xPos: '16px',
  yPos: '76px',
  width: '250px',
  minHeight: '450px',
  maxHeight: '450px',
};

export const Standard: ComponentStory<typeof FunctionList> = (args: FunctionListProps) => (
  <FloatingPanel {...toolboxPanelProps}>
    <FunctionList {...args} />
  </FloatingPanel>
);
Standard.args = {
  sample: 'something',
};
