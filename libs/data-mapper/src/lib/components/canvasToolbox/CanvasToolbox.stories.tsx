import { store } from '../../core/state/Store';
import { CanvasToolbox } from './CanvasToolbox';
import type { CanvasToolboxProps } from './CanvasToolbox';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: CanvasToolbox,
  title: 'Data Mapper Components/Floaties/Canvas Toolbox',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof CanvasToolbox>;

export const Standard: ComponentStory<typeof CanvasToolbox> = (args: CanvasToolboxProps) => <CanvasToolbox {...args} />;

Standard.args = {
  canvasBlockHeight: 500,
};
