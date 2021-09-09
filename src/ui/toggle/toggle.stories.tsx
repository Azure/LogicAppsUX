// Button.stories.ts | Button.stories.tsx

import React from 'react';

import { ComponentMeta, ComponentStory } from '@storybook/react';

import { Toggle, ToggleProps } from './index';

export default {
  component: Toggle,
  title: 'Components/Advanced Options Toggle',
} as ComponentMeta<typeof Toggle>;

export const Standard: ComponentStory<typeof Toggle> = (args: ToggleProps) => <Toggle {...args} />;
Standard.args = {
  expanded: true,
};
