import React from 'react';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { PanelContainer, PanelContainerProps } from './';

export default {
  component: PanelContainer,
  title: 'Components/Panel',
} as ComponentMeta<typeof PanelContainer>;
export const Standard: ComponentStory<typeof PanelContainer> = (args: PanelContainerProps) => <PanelContainer {...args} />;

Standard.args = {
  isOpen: true,
};
