import { store } from '../../core/state/Store';
import type { PropertiesPaneProps } from './PropertiesPane';
import { PropertiesPane } from './PropertiesPane';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: PropertiesPane,
  title: 'Data Mapper Components/Pane/Properties Pane',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof PropertiesPane>;

export const Standard: ComponentStory<typeof PropertiesPane> = (args: PropertiesPaneProps) => <PropertiesPane {...args} />;

Standard.args = {
  setIsExpanded: (isExpanded: boolean) => console.log('Setting expanded to: ', isExpanded),
  setContentHeight: (height: number) => console.log('Setting content height to: ', height),
};
