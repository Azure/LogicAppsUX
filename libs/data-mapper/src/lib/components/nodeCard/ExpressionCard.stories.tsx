import { logicalBranding } from '../../constants/ExpressionConstants';
import type { ExpressionCardProps } from './ExpressionCard';
import { ExpressionCard } from './ExpressionCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import type { NodeProps } from 'react-flow-renderer';

export default {
  component: ExpressionCard,
  title: 'Data Mapper/ExpressionCard',
} as ComponentMeta<typeof ExpressionCard>;

export const WithIcon: ComponentStory<typeof ExpressionCard> = (args: NodeProps<ExpressionCardProps>) => <ExpressionCard {...args} />;
WithIcon.args = {
  data: {
    onClick: () => {
      console.log('Expression card clicked');
    },
    expressionName: 'Expression Name',
    inputs: [],
    numberOfInputs: 0,
    iconFileName: 'ChartYAngel.svg',
    expressionBranding: logicalBranding,
    displayHandle: false,
    disabled: false,
    error: false,
  },
};

export const WithoutIcon: ComponentStory<typeof ExpressionCard> = (args: NodeProps<ExpressionCardProps>) => <ExpressionCard {...args} />;
WithoutIcon.args = {
  data: {
    onClick: () => {
      console.log('Expression card clicked');
    },
    expressionName: 'Expression Name',
    inputs: [],
    numberOfInputs: 0,
    iconFileName: '',
    expressionBranding: logicalBranding,
    displayHandle: false,
    disabled: false,
    error: false,
  },
};
