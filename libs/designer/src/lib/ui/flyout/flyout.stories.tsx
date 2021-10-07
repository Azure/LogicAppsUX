// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Flyout, FlyoutProps } from './index';

export default {
  component: Flyout,
  title: 'Components/Flyout',
} as ComponentMeta<typeof Flyout>;

export const Standard: ComponentStory<typeof Flyout> = (args: FlyoutProps) => <Flyout {...args} />;
Standard.args = {
  text: 'Details can be found at http://aka.ms/logicapps-chunk.',
};
