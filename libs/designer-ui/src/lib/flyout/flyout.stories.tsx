// Button.stories.ts | Button.stories.tsx
import type { FlyoutProps } from './index';
import { Flyout } from './index';
import type { ComponentMeta, ComponentStory } from '@storybook/react';
import React from 'react';

export default {
  component: Flyout,
  title: 'Components/Flyout',
} as ComponentMeta<typeof Flyout>;

export const Standard: ComponentStory<typeof Flyout> = (args: FlyoutProps) => <Flyout {...args} />;
Standard.args = {
  text: 'Details can be found at http://aka.ms/logicapps-chunk.',
};
