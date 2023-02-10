import { store } from '../../core/state/Store';
import { Notification, NotificationTypes } from './Notification';
import type { NotificationProps } from './Notification';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';
import { Provider } from 'react-redux';

export default {
  component: Notification,
  title: 'Data Mapper Components/Notification',
  decorators: [
    (Story) => (
      <Provider store={store}>
        <Story />
      </Provider>
    ),
  ],
} as ComponentMeta<typeof Notification>;

export const Standard: ComponentStory<typeof Notification> = (args: NotificationProps) => <Notification {...args} />;

Standard.args = {
  type: NotificationTypes.SaveFailed,
};
