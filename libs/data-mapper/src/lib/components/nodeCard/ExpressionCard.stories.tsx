import type { ExpressionCardProps } from './ExpressionCard';
import { ExpressionCard } from './ExpressionCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import type { NodeProps } from 'react-flow-renderer';

export default {
  component: ExpressionCard,
  title: 'Data Mapper/ExpressionCard',
} as ComponentMeta<typeof ExpressionCard>;

export const Standard: ComponentStory<typeof ExpressionCard> = (args: NodeProps<ExpressionCardProps>) => <ExpressionCard {...args} />;
Standard.args = {
  data: {
    iconName: 'Diamond',
    onClick: () => console.log('Expression card clicked'),
    iconName: '12PointStar',
    expressionName: 'Expression Name',
    brandColor: 'purple',
    displayHandle: false,
    disabled: false,
    error: false,
  },
};
