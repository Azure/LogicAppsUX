import { ExpressionCard } from './ExpressionCard';
import type { CardProps } from './NodeCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: ExpressionCard,
  title: 'Data Mapper/ExpressionCard',
} as ComponentMeta<typeof ExpressionCard>;

export const Standard: ComponentStory<typeof ExpressionCard> = (args: CardProps) => <ExpressionCard {...args} />;
Standard.args = {
  iconName: '12PointStar',
  expressionName: 'Expression Name',
  brandColor: 'purple',
  onClick: () => console.log('Expression card clicked'),
  disabled: false,
};
