import { store } from '../../core/state/Store';
import { TestMapPanel } from './TestMapPanel';
import type { TestMapPanelProps } from './TestMapPanel';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: TestMapPanel,
  title: 'Data Mapper Components/Panel/Test Map',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof TestMapPanel>;

export const Standard: ComponentStory<typeof TestMapPanel> = (args: TestMapPanelProps) => <TestMapPanel {...args} />;

Standard.args = {
  isOpen: true,
};
