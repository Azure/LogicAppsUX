import type { ExpressionCardProps } from './ExpressionCard';
import { ExpressionCard } from './ExpressionCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import type { NodeProps } from 'react-flow-renderer';

export default {
  component: ExpressionCard,
  title: 'Data Mapper Components/Node card',
} as ComponentMeta<typeof ExpressionCard>;

export const Expression: ComponentStory<typeof ExpressionCard> = (args: NodeProps<ExpressionCardProps>) => <ExpressionCard {...args} />;
Expression.args = {
  data: {
    onClick: () => console.log('Expression card clicked'),
    iconName: '12PointStar',
    expressionName: 'Expression Name',
    brandColor: 'purple',
    displayHandle: false,
    disabled: false,
    error: false,
  },
};
