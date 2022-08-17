import type { ExpressionCardProps } from './ExpressionCard';
import { ExpressionCard } from './ExpressionCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ExpressionCard,
  title: 'Data Mapper/ExpressionCard',
} as ComponentMeta<typeof ExpressionCard>;

export const Standard: ComponentStory<typeof ExpressionCard> = (args: ExpressionCardProps) => <ExpressionCard {...args} />;
Standard.args = {
  iconName: '12PointStar',
  onClick: () => console.log('Expression card clicked'),
  disabled: false,
};
