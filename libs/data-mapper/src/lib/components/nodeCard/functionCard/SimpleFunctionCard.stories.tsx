import { logicalBranding } from '../../../constants/FunctionConstants';
import { FunctionCategory, NormalizedDataType } from '../../../models';
import type { FunctionCardProps } from './FunctionCard';
import { SimpleFunctionCard } from './SimpleFunctionCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import type { NodeProps } from 'reactflow';

export default {
  component: SimpleFunctionCard,
  title: 'Data Mapper Components/Card/Function Card',
} as ComponentMeta<typeof SimpleFunctionCard>;

export const WithIcon: ComponentStory<typeof SimpleFunctionCard> = (args: NodeProps<FunctionCardProps>) => <SimpleFunctionCard {...args} />;
WithIcon.args = {
  data: {
    onClick: () => {
      console.log('Function card clicked');
    },
    functionData: {
      key: 'key',
      functionName: 'function-name',
      displayName: 'Function Display Name',
      type: 'TransformationFunction',
      maxNumberOfInputs: 0,
      inputs: [],
      outputValueType: NormalizedDataType.Any,
      category: FunctionCategory.Utility,
      description: 'This is the function description',
      iconFileName: 'ChartYAngel.svg',
    },
    dataTestId: '',
    functionBranding: logicalBranding,
    displayHandle: false,
    disabled: false,
    error: false,
  },
};

export const WithoutIcon: ComponentStory<typeof SimpleFunctionCard> = (args: NodeProps<FunctionCardProps>) => (
  <SimpleFunctionCard {...args} />
);
WithoutIcon.args = {
  data: {
    onClick: () => {
      console.log('Function card clicked');
    },
    functionData: {
      key: 'key',
      functionName: 'function-name',
      displayName: 'Function Display Name',
      type: 'TransformationFunction',
      maxNumberOfInputs: 0,
      inputs: [],
      outputValueType: NormalizedDataType.Any,
      category: FunctionCategory.Utility,
      description: 'This is the function description',
    },
    dataTestId: '',
    functionBranding: logicalBranding,
    displayHandle: false,
    disabled: false,
    error: false,
  },
};
