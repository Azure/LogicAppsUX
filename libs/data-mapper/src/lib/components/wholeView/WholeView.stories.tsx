import { store } from '../../core/state/Store';
import { WholeMapOverview } from './WholeView';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: WholeMapOverview,
  title: 'Data Mapper Components/Map Overview/Whole Overview',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof WholeMapOverview>;

export const Standard: ComponentStory<typeof WholeMapOverview> = () => <WholeMapOverview />;
