import { store } from '../../../core/state/Store';
import { FunctionCategory, ifPseudoFunction } from '../../../models';
import { getFunctionBrandingForCategory } from '../../../utils/Function.Utils';
import type { FunctionCardProps } from './FunctionCard';
import { SimpleFunctionCard } from './SimpleFunctionCard';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';
import type { NodeProps } from 'reactflow';
import { ReactFlowProvider } from 'reactflow';

export default {
  component: SimpleFunctionCard,
  title: 'Data Mapper Components/Card/Function Card',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <ReactFlowProvider>
          <Story />
        </ReactFlowProvider>
      </Provider>
    ),
  ],
} as ComponentMeta<typeof SimpleFunctionCard>;

export const Standard: ComponentStory<typeof SimpleFunctionCard> = (args: NodeProps<FunctionCardProps>) => <SimpleFunctionCard {...args} />;

Standard.args = {
  data: {
    onClick: () => console.log('Function card clicked'),
    functionData: ifPseudoFunction,
    dataTestId: 'if-1',
    functionBranding: getFunctionBrandingForCategory(FunctionCategory.Logical),
    displayHandle: true,
    disabled: false,
    error: false,
  },
};
