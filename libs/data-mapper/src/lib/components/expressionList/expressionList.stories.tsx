import type { ExpressionListProps } from './expressionList';
import { ExpressionList } from './expressionList';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ExpressionList,
  title: 'Data Mapper/ExpressionList',
} as ComponentMeta<typeof ExpressionList>;

export const Standard: ComponentStory<typeof ExpressionList> = (args: ExpressionListProps) => <ExpressionList {...args} />;
Standard.args = {
  sample: 'something',
};
