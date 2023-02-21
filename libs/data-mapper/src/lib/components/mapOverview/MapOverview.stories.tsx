import { store } from '../../core/state/Store';
import { MapOverview } from './MapOverview';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: MapOverview,
  title: 'Data Mapper Components/Map Overview/Overview',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof MapOverview>;

export const Standard: ComponentStory<typeof MapOverview> = () => <MapOverview />;
