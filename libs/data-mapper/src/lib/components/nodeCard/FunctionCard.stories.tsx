import { logicalBranding } from '../../constants/FunctionConstants';
import type { FunctionCardProps } from './FunctionCard';
import { FunctionCard } from './FunctionCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import type { NodeProps } from 'react-flow-renderer';

export default {
  component: FunctionCard,
  title: 'Data Mapper Components/Card/Function Card',
} as ComponentMeta<typeof FunctionCard>;

export const WithIcon: ComponentStory<typeof FunctionCard> = (args: NodeProps<FunctionCardProps>) => <FunctionCard {...args} />;
WithIcon.args = {
  data: {
    onClick: () => {
      console.log('Function card clicked');
    },
    functionName: 'Function Name',
    inputs: [],
    maxNumberOfInputs: 0,
    iconFileName: 'ChartYAngel.svg',
    functionBranding: logicalBranding,
    displayHandle: false,
    disabled: false,
    error: false,
  },
};

export const WithoutIcon: ComponentStory<typeof FunctionCard> = (args: NodeProps<FunctionCardProps>) => <FunctionCard {...args} />;
WithoutIcon.args = {
  data: {
    onClick: () => {
      console.log('Function card clicked');
    },
    functionName: 'Function Name',
    inputs: [],
    maxNumberOfInputs: 0,
    iconFileName: '',
    functionBranding: logicalBranding,
    displayHandle: false,
    disabled: false,
    error: false,
  },
};
