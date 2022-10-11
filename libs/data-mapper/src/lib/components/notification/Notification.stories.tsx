import { Notification } from './Notification';
import type { NotificationProps } from './Notification';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: Notification,
  title: 'Data Mapper Component/Notification',
} as ComponentMeta<typeof Notification>;

export const Standard: ComponentStory<typeof Notification> = (args: NotificationProps) => <Notification {...args} />;
