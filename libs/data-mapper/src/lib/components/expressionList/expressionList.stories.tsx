import type { FloatingPanelProps } from '../floatingPanel/FloatingPanel';
import { FloatingPanel } from '../floatingPanel/FloatingPanel';
import type { ExpressionListProps } from './expressionList';
import { ExpressionList } from './expressionList';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ExpressionList,
  title: 'Data Mapper/ExpressionList',
} as ComponentMeta<typeof ExpressionList>;

const toolboxPanelProps: FloatingPanelProps = {
  xPos: '16px',
  yPos: '76px',
  width: '250px',
  minHeight: '450px',
  maxHeight: '450px',
};

export const Standard: ComponentStory<typeof ExpressionList> = (args: ExpressionListProps) => (
  <FloatingPanel {...toolboxPanelProps}>
    <ExpressionList {...args} />
  </FloatingPanel>
);
Standard.args = {
  sample: 'something',
};
