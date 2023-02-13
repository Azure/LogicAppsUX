import type { DMTooltipProps } from './tooltip';
import { DMTooltip } from './tooltip';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: DMTooltip,
  title: 'Data Mapper Components/Tooltip',
} as ComponentMeta<typeof DMTooltip>;

const Template: ComponentStory<typeof DMTooltip> = (args: DMTooltipProps) => <DMTooltip {...args} />;

export const Standard = Template.bind({});

Standard.args = {
  text: '"We love tooltips...when they actually work!" -Data Mapper devs',
};
