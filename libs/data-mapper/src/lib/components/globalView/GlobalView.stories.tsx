import { store } from '../../core/state/Store';
import { GlobalView } from './GlobalView';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: GlobalView,
  title: 'Data Mapper Components/Map Overview/Global View',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof GlobalView>;

export const Standard: ComponentStory<typeof GlobalView> = () => <GlobalView />;
